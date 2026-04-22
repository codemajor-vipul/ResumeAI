import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Landing page for the OAuth redirect from the Auth API.
 * URL shape: /auth/callback?token=<jwt>&returnUrl=<path>
 *            /auth/callback?error=<code>
 *
 * Stores the JWT in localStorage, refreshes the auth context profile,
 * then sends the user to their destination.
 */
export default function OAuthCallbackPage() {
  const [params]      = useSearchParams()
  const [msg, setMsg] = useState('Completing sign-in…')

  useEffect(() => {
    const token     = params.get('token')
    const error     = params.get('error')
    const returnUrl = params.get('returnUrl') ?? '/'

    if (error) {
      const friendly: Record<string, string> = {
        oauth_failed : 'OAuth sign-in failed. Please try again.',
        no_email     : 'Your account did not share an email address.',
        login_failed : 'Could not sign you in. Please try again.',
      }
      setMsg(friendly[error] ?? 'Sign-in failed.')
      setTimeout(() => { window.location.replace('/auth') }, 2500)
      return
    }

    if (!token) {
      setMsg('No token received — redirecting…')
      setTimeout(() => { window.location.replace('/auth') }, 1500)
      return
    }

    // Store token so the axios interceptor picks it up immediately
    localStorage.setItem('token', token)

    // Full-page reload so AuthContext re-initialises from localStorage.
    // (React Router navigate() won't re-run the AuthProvider useState init.)
    window.location.replace(returnUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f5f5fa', gap: 16,
    }}>
      <div style={{ fontSize: 40 }}>⚡</div>
      <p style={{ fontSize: 16, color: '#374151', fontWeight: 500 }}>{msg}</p>
    </div>
  )
}
