import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api'
import { card, btn, input, row, C, errBox, tabBtn } from '../styles'

type Tab = 'profile' | 'password' | 'subscription' | 'danger'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [tab, setTab] = useState<Tab>(params.get('upgrade') ? 'subscription' : 'profile')
  const [err, setErr] = useState('')
  const [ok,  setOk]  = useState('')
  const [busy, setBusy] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone,    setPhone]    = useState(user?.phone ?? '')

  // Password form
  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')

  useEffect(() => {
    if (user) { setFullName(user.fullName); setPhone(user.phone ?? '') }
  }, [user])

  const run = async (fn: () => Promise<void>, successMsg: string) => {
    setErr(''); setOk(''); setBusy(true)
    try { await fn(); setOk(successMsg) }
    catch (e: any) { setErr(e?.response?.data?.error ?? e?.message ?? 'Error') }
    finally { setBusy(false) }
  }

  const saveProfile = () => run(async () => {
    await authApi.updateProfile({ fullName, phone })
    // Refresh the page so AuthContext re-fetches profile
    window.location.reload()
  }, 'Profile updated!')

  const changePassword = () => {
    if (newPwd !== confPwd) { setErr('Passwords do not match'); return }
    if (newPwd.length < 6)  { setErr('Password must be at least 6 characters'); return }
    run(async () => {
      await authApi.changePassword({ currentPassword: curPwd, newPassword: newPwd })
      setCurPwd(''); setNewPwd(''); setConfPwd('')
    }, 'Password changed successfully!')
  }

  const upgrade = () => run(async () => {
    await authApi.updateSubscription('PREMIUM')
    window.location.reload()
  }, 'Upgraded to PREMIUM!')

  const downgrade = () => run(async () => {
    await authApi.updateSubscription('FREE')
    window.location.reload()
  }, 'Downgraded to FREE plan.')

  const deactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account? This cannot be undone.')) return
    await run(async () => {
      await authApi.deactivate()
      logout(); navigate('/auth')
    }, '')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile',      label: '👤 Profile'      },
    { key: 'password',     label: '🔐 Password'      },
    { key: 'subscription', label: '⭐ Subscription'  },
    { key: 'danger',       label: '⚠️ Danger Zone'   },
  ]

  const isPremium = user?.subscriptionPlan === 'PREMIUM'

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>👤 My Profile</h2>
      <p style={{ margin: '0 0 20px', color: C.textSub, fontSize: 14 }}>
        Manage your account settings, password and subscription.
      </p>

      <div style={{ ...row, marginBottom: 20 }}>
        {tabs.map(t => <button key={t.key} style={tabBtn(tab === t.key)} onClick={() => { setTab(t.key); setErr(''); setOk('') }}>{t.label}</button>)}
      </div>

      {err && <div style={errBox}>{err}</div>}
      {ok  && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '0.6rem', color: '#166534', fontSize: 13, marginBottom: 12 }}>{ok}</div>}

      {/* Profile tab */}
      {tab === 'profile' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 14px' }}>Edit Profile</h3>
          <label style={{ fontSize: 13, color: C.textSub }}>Full Name</label>
          <input style={input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" />
          <label style={{ fontSize: 13, color: C.textSub }}>Email</label>
          <input style={{ ...input, background: '#f9fafb', color: C.textSub }} value={user?.email ?? ''} disabled />
          <label style={{ fontSize: 13, color: C.textSub }}>Phone (optional)</label>
          <input style={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +1 555 000 1234" />
          <div style={row}>
            <button style={btn()} onClick={saveProfile} disabled={busy}>💾 Save Changes</button>
          </div>
        </div>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 14px' }}>Change Password</h3>
          <label style={{ fontSize: 13, color: C.textSub }}>Current password</label>
          <input style={input} type="password" value={curPwd}  onChange={e => setCurPwd(e.target.value)}  placeholder="Current password" />
          <label style={{ fontSize: 13, color: C.textSub }}>New password</label>
          <input style={input} type="password" value={newPwd}  onChange={e => setNewPwd(e.target.value)}  placeholder="New password (min 6 chars)" />
          <label style={{ fontSize: 13, color: C.textSub }}>Confirm new password</label>
          <input style={input} type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="Confirm new password" />
          <button style={btn()} onClick={changePassword} disabled={busy || !curPwd || !newPwd || !confPwd}>🔐 Update Password</button>
        </div>
      )}

      {/* Subscription tab */}
      {tab === 'subscription' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 14px' }}>Subscription</h3>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <PlanCard
              name="FREE"
              price="$0/mo"
              features={['3 resumes', 'Basic AI tools (Summary, ATS, Skills)', 'PDF export', 'Free templates']}
              current={!isPremium}
              color={C.gray}
            />
            <PlanCard
              name="PREMIUM"
              price="$12/mo"
              features={['Unlimited resumes', 'All AI tools (Cover Letter, Tailor, Translate…)', 'PDF, DOCX & JSON export', 'Premium templates', 'Job Match analysis', 'Priority support']}
              current={isPremium}
              color={C.indigo}
            />
          </div>
          <div style={row}>
            {!isPremium
              ? <button style={btn(C.indigo)} onClick={upgrade} disabled={busy}>⬆ Upgrade to Premium</button>
              : <button style={btn(C.gray)}   onClick={downgrade} disabled={busy}>⬇ Downgrade to Free</button>}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {tab === 'danger' && (
        <div style={{ ...card, border: `2px solid ${C.red}` }}>
          <h3 style={{ margin: '0 0 8px', color: C.red }}>⚠️ Danger Zone</h3>
          <p style={{ fontSize: 13, color: C.textSub, marginBottom: 16 }}>
            Deactivating your account is permanent. All your resumes, sections, and export history will be inaccessible.
          </p>
          <button style={btn(C.red)} onClick={deactivate} disabled={busy}>
            🗑 Deactivate My Account
          </button>
        </div>
      )}
    </div>
  )
}

// ── Plan card ──────────────────────────────────────────────────────────────────
function PlanCard({ name, price, features, current, color }: {
  name: string; price: string; features: string[]; current: boolean; color: string
}) {
  return (
    <div style={{
      flex: 1, borderRadius: 12, padding: '1.25rem',
      border: `2px solid ${current ? color : C.border}`,
      background: current ? (name === 'PREMIUM' ? '#f5f3ff' : '#f9fafb') : '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <strong style={{ fontSize: 16, color }}>{name}</strong>
        {current && <span style={pill(color)}>Current</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color }}>{price}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
        {features.map(f => <li key={f}>{f}</li>)}
      </ul>
    </div>
  )
}

function pill(bg: string, fg = '#fff') {
  return { display: 'inline-block' as const, background: bg, color: fg, borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 as const }
}
