import { useEffect, useMemo, useState } from 'react'
import EntrySidebar from '../components/EntrySidebar'
import EssayEditor from '../components/EssayEditor'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import ReflectionPreview from '../components/ReflectionPreview'
import { supabase } from '../lib/supabaseClient'

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function sortEntriesNewestFirst(entries) {
  return [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
}

function getEntryContent(entries, dateValue) {
  return (
    entries.find((entry) => entry.entry_date === dateValue)?.content || ''
  )
}

function getEntryForDate(entries, dateValue) {
  return entries.find((entry) => entry.entry_date === dateValue) || null
}

function MainPage({ profile, session, onSignOut }) {
  const today = useMemo(() => getTodayDate(), [])
  const [entries, setEntries] = useState([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [content, setContent] = useState('')
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [isLoadingReflection, setIsLoadingReflection] = useState(false)
  const [reflection, setReflection] = useState(null)
  const [mentalContext, setMentalContext] = useState(null)
  const [reflectionStatus, setReflectionStatus] = useState('')
  const [reflectionError, setReflectionError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  const userId = session.user.id
  const selectedEntry = getEntryForDate(entries, selectedDate)
  const displayName =
    profile?.display_name || session.user.email?.split('@')[0] || 'there'

  useEffect(() => {
    let isMounted = true

    async function loadEntries() {
      setIsLoadingEntries(true)
      setLoadError('')

      const { data, error } = await supabase
        .from('journal_entries')
        .select('id,user_id,entry_date,content,created_at,updated_at')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })

      if (!isMounted) {
        return
      }

      if (error) {
        setLoadError(error.message)
        setEntries([])
      } else {
        const nextEntries = data || []
        setEntries(nextEntries)
        setSelectedDate(today)
        setContent(getEntryContent(nextEntries, today))
      }

      setIsLoadingEntries(false)
    }

    loadEntries()

    return () => {
      isMounted = false
    }
  }, [today, userId])

  useEffect(() => {
    let isMounted = true

    async function loadReflection(entryId) {
      setIsLoadingReflection(true)
      setReflectionStatus('')
      setReflectionError('')

      const [
        { data: reflectionData, error: reflectionLoadError },
        { data: mentalContextData, error: contextLoadError },
      ] = await Promise.all([
        supabase
          .from('entry_reflections')
          .select(
            'id,entry_id,user_id,summary,emotions,themes,gentle_questions,supportive_note,risk_level,created_at,updated_at',
          )
          .eq('entry_id', entryId)
          .maybeSingle(),
        supabase
          .from('user_mental_context')
          .select(
            'user_id,long_term_summary,recurring_themes,emotional_patterns,helpful_response_style,last_updated_entry_date,updated_at',
          )
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      if (!isMounted) {
        return
      }

      if (reflectionLoadError || contextLoadError) {
        setReflectionError(
          reflectionLoadError?.message ||
            contextLoadError?.message ||
            'Could not load reflection support.',
        )
      }

      setReflection(reflectionData || null)
      setMentalContext(mentalContextData || null)
      setIsLoadingReflection(false)
    }

    if (!selectedEntry?.id) {
      return
    }

    loadReflection(selectedEntry.id)

    return () => {
      isMounted = false
    }
  }, [selectedEntry?.id, userId])

  function handleSelectDate(dateValue) {
    if (!dateValue) {
      return
    }

    setSelectedDate(dateValue)
    setContent(getEntryContent(entries, dateValue))
    setReflection(null)
    setMentalContext(null)
    setSaveStatus('')
    setReflectionStatus('')
    setReflectionError('')
    setIsLoadingReflection(false)
  }

  async function handleSave() {
    setSaveStatus('Saving...')

    const { data, error } = await supabase
      .from('journal_entries')
      .upsert(
        {
          user_id: userId,
          entry_date: selectedDate,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,entry_date' },
      )
      .select('id,user_id,entry_date,content,created_at,updated_at')
      .single()

    if (error) {
      setSaveStatus(`Error: ${error.message}`)
      return
    }

    setEntries((currentEntries) => {
      const withoutSavedDate = currentEntries.filter(
        (entry) => entry.entry_date !== data.entry_date,
      )
      return sortEntriesNewestFirst([...withoutSavedDate, data])
    })
    setSaveStatus('Saved')
  }

  async function handleReflectOnEntry() {
    if (!selectedEntry?.id) {
      setReflectionError('Please save this entry before reflecting on it.')
      return
    }

    setIsLoadingReflection(true)
    setReflectionStatus('Reflecting...')
    setReflectionError('')

    const { data, error } = await supabase.functions.invoke('reflect-entry', {
      body: { entry_id: selectedEntry.id },
    })

    if (error) {
      setReflectionError(error.message || 'Reflection failed.')
      setReflectionStatus('')
      setIsLoadingReflection(false)
      return
    }

    setReflection(data.reflection || null)
    setMentalContext(data.mental_context || null)
    setReflectionStatus('Reflection ready')
    setIsLoadingReflection(false)
  }

  return (
    <div className="app-shell">
      <Navbar displayName={displayName} onSignOut={onSignOut} />

      <main className="journal-layout">
        <EntrySidebar
          entries={entries}
          isLoading={isLoadingEntries}
          selectedDate={selectedDate}
          today={today}
          onSelectDate={handleSelectDate}
        />

        <section className="journal-main" aria-label="Journal editor">
          <div className="greeting-card">
            <p className="greeting-label">Today&apos;s reflection</p>
            <h1>Welcome back, {displayName}!</h1>
          </div>

          {loadError ? (
            <p className="page-error" role="alert">
              Could not load journal entries: {loadError}
            </p>
          ) : null}

          <EssayEditor
            content={content}
            selectedDate={selectedDate}
            today={today}
            saveStatus={saveStatus}
            onChangeContent={setContent}
            onChangeDate={handleSelectDate}
            onSave={handleSave}
          />

          <ReflectionPreview
            canReflect={Boolean(selectedEntry?.id)}
            isLoading={isLoadingReflection}
            reflection={reflection}
            mentalContext={mentalContext}
            status={reflectionStatus}
            errorMessage={reflectionError}
            onReflect={handleReflectOnEntry}
          />
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default MainPage
