
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import './App.css'

type Message = {
  id: number
  user_id: string
  username: string
  content: string
  created_at: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function loadMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setMessages(data ?? [])
    }
  }

  useEffect(() => {
    let active = true

    async function initialize() {
      const { data } = await supabase.auth.getUser()

      if (active) {
        setUser(data.user)
        await loadMessages()
        setLoading(false)
      }
    }

    void initialize()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.href,
      },
    })

    if (error) setError(error.message)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
    else setUser(null)
  }

  async function postMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user || !content.trim() || posting) return

    setPosting(true)
    setError('')

    const username =
      user.user_metadata.user_name ||
      user.user_metadata.preferred_username ||
      user.user_metadata.name ||
      'GitHub User'

    const { error } = await supabase.from('messages').insert({
      user_id: user.id,
      username,
      content: content.trim(),
    })

    if (error) {
      setError(error.message)
    } else {
      setContent('')
      await loadMessages()
    }

    setPosting(false)
  }

  if (loading) return <p>Loading guestbook...</p>

  return (
    <main className="container">
      <header>
        <h1>Guestbook</h1>
        <p>Leave a message for everyone!</p>

        {user ? (
          <div className="account">
            {user.user_metadata.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="GitHub avatar"
                className="avatar"
              />
            )}
            <span>
              Signed in as{' '}
              {user.user_metadata.user_name || 'GitHub User'}
            </span>
            <button onClick={signOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={signIn}>Sign In with GitHub</button>
        )}
      </header>

      {error && <p className="error">{error}</p>}

      {user ? (
        <form onSubmit={postMessage}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write your message..."
            maxLength={1000}
            required
          />
          <button type="submit" disabled={posting}>
            {posting ? 'Posting...' : 'Post Message'}
          </button>
        </form>
      ) : (
        <p>Sign in with GitHub to leave a message.</p>
      )}

      <h2>Messages</h2>

      {messages.length === 0 ? (
        <p>No messages yet. Be the first!</p>
      ) : (
        <div className="messages">
          {messages.map((message) => (
            <article key={message.id} className="message">
              <div className="message-header">
                <strong>{message.username}</strong>
                <time>
                  {new Date(message.created_at).toLocaleString()}
                </time>
              </div>
              <p>{message.content}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

export default App
