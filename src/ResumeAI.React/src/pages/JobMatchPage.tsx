import { useState } from 'react'
import { resumeApi, jobMatchApi } from '../api'
import type { Resume, JobMatch } from '../types'
import { card, btn, input, textarea, select, row, C, errBox, scoreColor, tabBtn } from '../styles'

type Tab = 'analyze' | 'my' | 'top'

export default function JobMatchPage() {
  const [tab,      setTab]     = useState<Tab>('analyze')
  const [resumes,  setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId]= useState('')
  const [jobTitle, setJobTitle]= useState('Senior Software Engineer')
  const [jobDesc,  setJobDesc] = useState('We are looking for a .NET developer with experience in microservices, Docker, and PostgreSQL.')
  const [matches,  setMatches] = useState<JobMatch[]>([])
  const [activeMatch, setActiveMatch] = useState<JobMatch | null>(null)
  const [recs,     setRecs]    = useState<string>('')
  const [err,      setErr]     = useState('')
  const [busy,     setBusy]    = useState(false)

  const run = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setErr(''); setBusy(true)
    try { return await fn() }
    catch (e: any) { setErr(e?.response?.data?.error ?? e?.message ?? 'Error'); return null }
    finally { setBusy(false) }
  }

  const loadResumes = () => run(async () => { const d = await resumeApi.getAll(); setResumes(d); return d })
  const analyze = () => run(async () => {
    if (!resumeId) { setErr('Select a resume first'); return }
    const m = await jobMatchApi.analyze({ resumeId: Number(resumeId), jobTitle, jobDescription: jobDesc })
    setMatches(prev => [m, ...prev])
    return m
  })
  const loadMy  = () => run(async () => { const d = await jobMatchApi.getMyMatches();   setMatches(d); return d })
  const loadTop = () => run(async () => { const d = await jobMatchApi.getTop(60);        setMatches(d); return d })
  const loadForResume = () => run(async () => { if (!resumeId) return; const d = await jobMatchApi.getByResume(Number(resumeId)); setMatches(d); return d })

  const bookmark = (m: JobMatch) => run(async () => {
    await jobMatchApi.bookmark(m.matchId, !m.isBookmarked)
    setMatches(prev => prev.map(x => x.matchId === m.matchId ? { ...x, isBookmarked: !x.isBookmarked } : x))
  })
  const del = (m: JobMatch) => run(async () => {
    await jobMatchApi.delete(m.matchId)
    setMatches(prev => prev.filter(x => x.matchId !== m.matchId))
    if (activeMatch?.matchId === m.matchId) { setActiveMatch(null); setRecs('') }
  })
  const loadRecs = (m: JobMatch) => run(async () => {
    setActiveMatch(m); setRecs('')
    const r = await jobMatchApi.getRecommendations(m.matchId)
    setRecs(r)
    return r
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'analyze', label: '🔍 Analyse New' },
    { key: 'my',      label: '📋 My Matches'  },
    { key: 'top',     label: '⭐ Top Matches'  },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>🎯 Job Match</h2>
      <p style={{ margin: '0 0 20px', color: C.textSub, fontSize: 14 }}>
        AI-powered job fit analysis. Requires <span style={pill(C.indigo)}>PREMIUM</span> plan.
      </p>

      <div style={{ ...row, marginBottom: 20 }}>
        {tabs.map(t => <button key={t.key} style={tabBtn(tab === t.key)} onClick={() => { setTab(t.key); setActiveMatch(null); setRecs('') }}>{t.label}</button>)}
      </div>

      {err && <div style={errBox}>{err}</div>}

      {/* Tab: Analyse */}
      {tab === 'analyze' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 14px' }}>Analyse Job Fit</h3>

          <div style={row}>
            <button style={btn(C.gray)} onClick={loadResumes} disabled={busy}>🔄 Load My Resumes</button>
          </div>
          {resumes.length > 0
            ? <select style={select} value={resumeId} onChange={e => setResumeId(e.target.value)}>
                <option value="">— select resume —</option>
                {resumes.map(r => <option key={r.resumeId} value={r.resumeId}>{r.title} (#{r.resumeId})</option>)}
              </select>
            : <input style={input} value={resumeId} onChange={e => setResumeId(e.target.value)} placeholder="Resume ID" />
          }
          <input style={input} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job title" />
          <textarea style={{ ...textarea, minHeight: 120 }} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Paste the full job description here…" />

          <div style={row}>
            <button style={btn()} onClick={analyze} disabled={busy || !resumeId}>
              {busy ? '…' : '🔍 Analyse Fit'}
            </button>
            <button style={btn(C.sky)} onClick={loadForResume} disabled={!resumeId || busy}>
              Load for This Resume
            </button>
          </div>

          <MatchList matches={matches} active={activeMatch} busy={busy} recs={recs}
            onBookmark={bookmark} onDelete={del} onRecs={loadRecs} />
        </div>
      )}

      {/* Tab: My Matches */}
      {tab === 'my' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>All My Matches ({matches.length})</h3>
            <button style={btn(C.gray)} onClick={loadMy} disabled={busy}>🔄 Load</button>
          </div>
          {matches.length === 0 && !busy && <p style={{ color: C.textSub, fontSize: 14 }}>No matches yet. Use Analyse New tab to run an analysis.</p>}
          <MatchList matches={matches} active={activeMatch} busy={busy} recs={recs}
            onBookmark={bookmark} onDelete={del} onRecs={loadRecs} />
        </div>
      )}

      {/* Tab: Top Matches */}
      {tab === 'top' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Top Matches (≥ 60%)</h3>
            <button style={btn(C.gray)} onClick={loadTop} disabled={busy}>🔄 Load Top</button>
          </div>
          {matches.length === 0 && !busy && <p style={{ color: C.textSub, fontSize: 14 }}>Click "Load Top" to see your best matches.</p>}
          <MatchList matches={matches} active={activeMatch} busy={busy} recs={recs}
            onBookmark={bookmark} onDelete={del} onRecs={loadRecs} />
        </div>
      )}
    </div>
  )
}

// ── Match list ─────────────────────────────────────────────────────────────────
function MatchList({ matches, active, busy, recs, onBookmark, onDelete, onRecs }: {
  matches: JobMatch[]
  active: JobMatch | null
  busy: boolean
  recs: string
  onBookmark: (m: JobMatch) => void
  onDelete: (m: JobMatch) => void
  onRecs: (m: JobMatch) => void
}) {
  return (
    <>
      {matches.map(m => (
        <div key={m.matchId} style={{ borderBottom: `1px solid ${C.grayL}`, padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Score ring */}
            <div style={{ textAlign: 'center', minWidth: 52 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(m.matchScore) }}>{m.matchScore}%</div>
              <div style={{ fontSize: 10, color: C.textSub }}>fit</div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 14 }}>{m.jobTitle}</strong>
              <span style={{ fontSize: 11, color: C.textSub, marginLeft: 8 }}>#{m.matchId} · {m.source}</span>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                Resume #{m.resumeId} · {new Date(m.createdAt).toLocaleDateString()}
              </div>
              {m.missingSkills && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.red }}>
                  Missing skills: {m.missingSkills}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button style={btn(m.isBookmarked ? '#fbbf24' : C.gray, m.isBookmarked ? '#1e1e2e' : '#fff')}
                onClick={() => onBookmark(m)} disabled={busy}>
                {m.isBookmarked ? '★' : '☆'}
              </button>
              <button style={btn(active?.matchId === m.matchId ? C.sky : C.blue)}
                onClick={() => onRecs(m)} disabled={busy}>
                {active?.matchId === m.matchId ? '📋 Open' : '💡 Recs'}
              </button>
              <button style={btn(C.red)} onClick={() => onDelete(m)} disabled={busy}>✕</button>
            </div>
          </div>

          {/* Recommendations panel */}
          {active?.matchId === m.matchId && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.75rem', marginTop: 8, fontSize: 13 }}>
              <strong style={{ color: C.green }}>💡 AI Tailoring Recommendations</strong>
              {recs
                ? <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{recs}</p>
                : <p style={{ margin: '8px 0 0', color: C.textSub }}>Loading recommendations…</p>}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

function pill(bg: string, fg = '#fff') {
  return { display: 'inline-block' as const, background: bg, color: fg, borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 as const }
}
