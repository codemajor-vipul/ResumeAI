import { useState } from 'react'
import { resumeApi, jobMatchApi } from '../api'

const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 16 }
const inp: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }
const btn = (c = '#6366f1'): React.CSSProperties => ({ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: c, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, marginRight: 8 })

export default function JobMatchPage() {
  const [resumes, setResumes]   = useState<any[]>([])
  const [resumeId, setResumeId] = useState('')
  const [jobTitle, setJobTitle] = useState('Senior Software Engineer')
  const [jobDesc, setJobDesc]   = useState('We are looking for a .NET developer with experience in microservices, Docker, and PostgreSQL...')
  const [matches, setMatches]   = useState<any[]>([])
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  const run = async (fn: () => Promise<any>) => {
    setErr(''); setLoading(true)
    try { return await fn() }
    catch (e: any) { setErr(e?.response?.data?.error ?? e.message) }
    finally { setLoading(false) }
  }

  const loadResumes  = () => run(async () => { const d = await resumeApi.getAll(); setResumes(d) })
  const analyze      = () => run(async () => {
    const m = await jobMatchApi.analyze({ resumeId: Number(resumeId), jobTitle, jobDescription: jobDesc })
    setMatches(prev => [m, ...prev])
  })
  const loadMatches  = () => run(async () => { const d = await jobMatchApi.getByResume(Number(resumeId)); setMatches(d) })
  const loadTop      = () => run(async () => { const d = await jobMatchApi.getTop(60); setMatches(d) })
  const toggleBookmark = (m: any) => run(async () => { await jobMatchApi.bookmark(m.matchId, !m.isBookmarked); await loadMatches() })

  const scoreColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>🎯 Job Match</h2>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
        Analyse how well your resume fits a job description. Requires PREMIUM plan.
      </p>

      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>Analyse Fit</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button style={btn('#6b7280')} onClick={loadResumes}>Load Resumes</button>
        </div>
        {resumes.length > 0 && (
          <select style={inp} value={resumeId} onChange={e => setResumeId(e.target.value)}>
            <option value="">— select resume —</option>
            {resumes.map((r: any) => <option key={r.resumeId} value={r.resumeId}>{r.title} (#{r.resumeId})</option>)}
          </select>
        )}
        {resumes.length === 0 && <input style={inp} value={resumeId} onChange={e => setResumeId(e.target.value)} placeholder="Resume ID (get it from Resume Flow page)" />}
        <input style={inp} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job title" />
        <textarea style={{ ...inp, minHeight: 100 }} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Paste full job description here…" />

        {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem', color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{err}</div>}

        <div>
          <button style={btn()} onClick={analyze} disabled={loading || !resumeId}>
            {loading ? '…' : '🔍 Analyse Job Fit'}
          </button>
          <button style={btn('#6b7280')} onClick={loadMatches} disabled={!resumeId}>Load for Resume</button>
          <button style={btn('#8b5cf6')} onClick={loadTop}>Top Matches (≥60%)</button>
        </div>
      </div>

      {matches.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 12px' }}>Results ({matches.length})</h3>
          {matches.map((m: any) => (
            <div key={m.matchId} style={{ borderBottom: '1px solid #f3f4f6', padding: '0.8rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(m.matchScore) }}>{m.matchScore}%</span>
                <div>
                  <strong>{m.jobTitle}</strong>
                  <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>#{m.matchId} · {m.source}</span>
                </div>
                <button style={{ marginLeft: 'auto', padding: '0.3rem 0.8rem', borderRadius: 8, border: 'none', cursor: 'pointer', background: m.isBookmarked ? '#fef3c7' : '#f3f4f6', fontSize: 13 }}
                  onClick={() => toggleBookmark(m)}>
                  {m.isBookmarked ? '★ Saved' : '☆ Save'}
                </button>
              </div>
              {m.missingSkills && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0' }}>Missing: {m.missingSkills}</p>}
              {m.recommendations && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0' }}>{m.recommendations}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
