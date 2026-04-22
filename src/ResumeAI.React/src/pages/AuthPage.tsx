import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '2rem',
  boxShadow: '0 4px 24px rgba(0,0,0,.08)', width: 380,
}
const input: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.8rem', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
}
const btn = (color = '#6366f1'): React.CSSProperties => ({
  width: '100%', padding: '0.7rem', borderRadius: 8, border: 'none',
  background: color, color: '#fff', fontWeight: 600, cursor: 'pointer', marginBottom: 8,
})

export default function AuthPage() {
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPass]     = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login, register }     = useAuth()
  const navigate                = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(fullName, email, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5fa' }}>
      <div style={card}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>⚡ ResumeAI</h1>
        <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 13 }}>E2E Test Client — {mode === 'login' ? 'Sign in' : 'Create account'}</p>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem 0.8rem', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <input style={input} placeholder="Full name" value={fullName}
              onChange={e => setFullName(e.target.value)} required />
          )}
          <input style={input} type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required />
          <input style={input} type="password" placeholder="Password" value={password}
            onChange={e => setPass(e.target.value)} required />
          <button style={btn()} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
          <button onClick={authApi.googleLogin}
            style={{ ...btn('#ea4335'), flex: 1, marginBottom: 0 }}>
            🔴 Google
          </button>
          <button onClick={authApi.linkedInLogin}
            style={{ ...btn('#0077b5'), flex: 1, marginBottom: 0 }}>
            🔵 LinkedIn
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 16 }}>
          {mode === 'login' ? "No account? " : "Have an account? "}
          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
            style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
