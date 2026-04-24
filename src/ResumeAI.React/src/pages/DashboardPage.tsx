import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { aiApi, resumeApi, exportApi } from '../api'
import type { Resume, AiRequest, AiQuota, ExportJob } from '../types'
import { card, btn, C, errBox } from '../styles'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [quota,   setQuota]   = useState<AiQuota | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [history, setHistory] = useState<AiRequest[]>([])
  const [exports, setExports] = useState<ExportJob[]>([])
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const [q, r, h, e] = await Promise.allSettled([
        aiApi.getQuota(),
        resumeApi.getAll(),
        aiApi.getHistory(),
        exportApi.getMyExports(),
      ])
      if (q.status === 'fulfilled') setQuota(q.value)
      if (r.status === 'fulfilled') setResumes(r.value)
      if (h.status === 'fulfilled') setHistory(h.value)
      if (e.status === 'fulfilled') setExports(e.value)
    } catch { setErr('Failed to load dashboard data') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const isPremium = user?.subscriptionPlan === 'PREMIUM'

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            👋 Welcome back, {user?.fullName?.split(' ')[0]}!
          </h2>
          <p style={{ margin: '4px 0 0', color: C.textSub, fontSize: 14 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button style={btn()} onClick={load}>🔄 Refresh</button>
      </div>

      {err && <div style={errBox}>{err}</div>}

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="📄" label="My Resumes"  value={resumes.length}  color={C.indigo} />
        <StatCard icon="📦" label="Exports"     value={exports.length}  color={C.blue}   />
        <StatCard icon="🤖" label="AI Requests" value={history.length}  color={C.purple} />
        <StatCard
          icon="⭐"
          label="Best ATS Score"
          value={resumes.length ? Math.max(...resumes.map(r => r.atsScore)) + '%' : '—'}
          color={C.green}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left column */}
        <div>
          {/* Account */}
          <div style={card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>👤 Account</h3>
            <table style={{ fontSize: 13, width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {([
                  ['Name',  user?.fullName],
                  ['Email', user?.email],
                  ['Role',  user?.role],
                  ['Plan',  <span style={pill(isPremium ? C.indigo : C.gray)}>{user?.subscriptionPlan}</span>],
                ] as [string, React.ReactNode][]).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '4px 12px 4px 0', color: C.textSub, width: 60 }}>{k}</td>
                    <td style={{ padding: '4px 0' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={btn(C.gray)} onClick={() => navigate('/profile')}>Edit Profile</button>
              {!isPremium && (
                <button style={btn(C.indigo)} onClick={() => navigate('/profile?upgrade=1')}>
                  ⬆ Upgrade to Premium
                </button>
              )}
            </div>
          </div>

          {/* AI Quota */}
          {quota && (
            <div style={card}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>🤖 AI Quota</h3>
              <QuotaBar label="Content" used={quota.maxContentCalls - quota.remainingContentCalls} max={quota.maxContentCalls} color={C.indigo} />
              <QuotaBar label="ATS"     used={quota.maxAtsCalls     - quota.remainingAtsCalls}     max={quota.maxAtsCalls}     color={C.sky}   />
            </div>
          )}

          {/* Recent Exports */}
          <div style={card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>📦 Recent Exports</h3>
            {loading && <p style={{ fontSize: 13, color: C.textSub }}>Loading…</p>}
            {!loading && exports.length === 0 && (
              <p style={{ fontSize: 13, color: C.textSub }}>No exports yet.</p>
            )}
            {exports.slice(0, 5).map(e => (
              <div key={e.jobId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.grayL}`, fontSize: 13 }}>
                <span style={pill(e.format === 'PDF' ? C.red : e.format === 'DOCX' ? C.blue : C.green, C.white)}>{e.format}</span>
                <span style={{ flex: 1, color: C.textSub }}>Resume #{e.resumeId}</span>
                <span style={{ color: e.status === 'COMPLETED' ? C.green : C.amber, fontWeight: 600 }}>{e.status}</span>
                {e.status === 'COMPLETED' && (
                  <a href={exportApi.downloadUrl(e.jobId)} style={{ color: C.indigo, fontSize: 12 }}>⬇</a>
                )}
              </div>
            ))}
            <button style={{ ...btn(C.gray), marginTop: 10 }} onClick={() => navigate('/exports')}>
              View all exports →
            </button>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* My Resumes */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>📄 My Resumes</h3>
              <button style={btn()} onClick={() => navigate('/resume')}>+ New Resume</button>
            </div>
            {loading && <p style={{ fontSize: 13, color: C.textSub }}>Loading…</p>}
            {!loading && resumes.length === 0 && (
              <p style={{ fontSize: 13, color: C.textSub }}>No resumes yet — create one!</p>
            )}
            {resumes.slice(0, 6).map(r => (
              <div key={r.resumeId} style={{ padding: '8px 0', borderBottom: `1px solid ${C.grayL}`, cursor: 'pointer' }}
                onClick={() => navigate('/resume')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{r.title}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.atsScore >= 80 ? C.green : r.atsScore >= 60 ? C.amber : C.red }}>
                    ATS {r.atsScore}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                  {r.targetJobTitle} · {r.isPublic ? '🌍 Public' : '🔒 Private'}
                </div>
              </div>
            ))}
          </div>

          {/* Recent AI history */}
          <div style={card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>🧠 Recent AI Requests</h3>
            {loading && <p style={{ fontSize: 13, color: C.textSub }}>Loading…</p>}
            {!loading && history.length === 0 && (
              <p style={{ fontSize: 13, color: C.textSub }}>No AI requests yet.</p>
            )}
            {history.slice(0, 6).map(h => (
              <div key={h.requestId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${C.grayL}`, fontSize: 12 }}>
                <span style={pill(C.purple)}>{h.requestType}</span>
                <span style={{ flex: 1, color: C.textSub }}>{h.model} · {h.tokensUsed} tokens</span>
                <span style={{ color: h.status === 'COMPLETED' ? C.green : C.amber }}>{h.status}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>⚡ Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '🎨 Browse Templates', path: '/templates', color: C.indigo },
                { label: '📄 Resume Builder',   path: '/resume',    color: C.blue   },
                { label: '🎯 Job Match',         path: '/jobmatch',  color: C.purple },
                { label: '🔔 Notifications',     path: '/notifications', color: C.amber },
                { label: '📦 My Exports',        path: '/exports',   color: C.green  },
                { label: '👤 My Profile',        path: '/profile',   color: C.gray   },
              ].map(a => (
                <button key={a.path} style={{ ...btn(a.color), width: '100%', textAlign: 'left' }}
                  onClick={() => navigate(a.path)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function pill(bg: string, fg = '#fff') {
  return { display: 'inline-block' as const, background: bg, color: fg, borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 as const }
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <div style={{ ...card, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 12, color: C.textSub }}>{label}</div>
      </div>
    </div>
  )
}

function QuotaBar({ label, used, max, color }: { label: string; used: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span>{label} calls</span>
        <span style={{ color: C.textSub }}>{used}/{max} used</span>
      </div>
      <div style={{ background: C.grayL, borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: pct > 80 ? C.red : color, height: '100%', borderRadius: 6, transition: 'width .4s' }} />
      </div>
    </div>
  )
}
