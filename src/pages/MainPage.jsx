import { useEffect, useMemo, useState } from 'react'
import EntrySidebar from '../components/EntrySidebar'
import EssayEditor from '../components/EssayEditor'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
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

function MainPage({ profile, session, onSignOut }) {
  const today = useMemo(() => getTodayDate(), [])
  const [entries, setEntries] = useState([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [content, setContent] = useState('')
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  const userId = session.user.id
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

  function handleSelectDate(dateValue) {
    setSelectedDate(dateValue)
    setContent(getEntryContent(entries, dateValue))
    setSaveStatus('')
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
            saveStatus={saveStatus}
            onChangeContent={setContent}
            onSave={handleSave}
          />
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default MainPage
