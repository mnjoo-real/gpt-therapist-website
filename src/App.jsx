import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'

function getCurrentPath() {
  return window.location.pathname
}

function navigateTo(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new Event('popstate'))
  }
}

function App() {
  const [path, setPath] = useState(getCurrentPath)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  useEffect(() => {
    const handlePopState = () => setPath(getCurrentPath())
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        console.error('Unable to load Supabase session:', error.message)
      }

      setSession(data.session)
      setIsLoadingSession(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
      }
      setIsLoadingSession(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function loadProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Unable to load profile:', error.message)
        setProfile(null)
        return
      }

      setProfile(data)
    }

    if (!session?.user?.id) {
      return
    }

    loadProfile(session.user.id)
  }, [session])

  useEffect(() => {
    if (isLoadingSession) {
      return
    }

    if (!session && path !== '/login') {
      navigateTo('/login')
    }

    if (session && path === '/login') {
      navigateTo('/')
    }
  }, [isLoadingSession, path, session])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigateTo('/login')
  }

  if (isLoadingSession) {
    return (
      <main className="app-loading" aria-live="polite">
        Loading your journal...
      </main>
    )
  }

  if (path === '/login') {
    return <LoginPage onNavigateHome={() => navigateTo('/')} />
  }

  if (!session) {
    return (
      <main className="app-loading" aria-live="polite">
        Redirecting to sign in...
      </main>
    )
  }

  return (
    <MainPage
      profile={profile}
      session={session}
      onSignOut={handleSignOut}
    />
  )
}

export default App
