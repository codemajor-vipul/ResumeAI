import { useEffect, useState } from 'react'
import { exportApi } from '../api'
import type { ExportJob } from '../types'
import { card, btn, row, C, errBox, tabBtn } from '../styles'

type Filter = 'all' | 'PDF' | 'DOCX' | 'JSON'

export default function ExportsPage() {
  const [exports,  setExports]  = useState<ExportJob[]>([])
  const [stats,    setStats]    = useState<Record<string, number> | null>(null)
  const [filter,   setFilter]   = useState<Filter>('all')
  const [err,      setErr]      = useState('')
  const [busy,     setBusy]     = useState(false)

  const run = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setErr(''); setBusy(true)
    try { return await fn() }
    catch (e: any) { setErr(e?.response?.data?.error ?? e?.message ?? 'Error'); return null }
    finally { setBusy(false) }
  }

  const load = () => run(async () => {
    const [e, s] = await Promise.all([exportApi.getMyExports(), exportApi.getStats()])
    setExports(e); setStats(s)
    return e
  })

  useEffect(() => { load() }, [])

  const del = (jobId: string) => run(async () => {
    await exportApi.delete(jobId)
    setExports(prev => prev.filter(e => e.jobId !== jobId))
  })

  const visible = filter === 'all' ? exports : exports.filter(e => e.format === filter)

  const statusColor = (s: string) => s === 'COMPLETED' ? C.green : s === 'FAILED' ? C.red : C.amber
  const fmtColor    = (f: string) => f === 'PDF' ? C.red : f === 'DOCX' ? C.blue : C.green

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>📦 My Exports</h2>
          <p style={{ margin: 0, color: C.textSub, fontSize: 14 }}>
            All resume exports across every format.
          </p>
        </div>
        <button style={btn(C.gray)} onClick={load} disabled={busy}>🔄 Refresh</button>
      </div>

      {err && <div style={errBox}>{err}</div>}

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} style={{ ...card, marginBottom: 0, textAlign: 'center' as const }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: fmtColor(k) }}>{v}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{k} exports</div>
            </div>
          ))}
          <div style={{ ...card, marginBottom: 0, textAlign: 'center' as const }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.indigo }}>{exports.length}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>Total</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ ...row, marginBottom: 16 }}>
        {(['all', 'PDF', 'DOCX', 'JSON'] as Filter[]).map(f => (
          <button key={f} style={tabBtn(filter === f)} onClick={() => setFilter(f)}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={card}>
        {visible.length === 0 && (
          <p style={{ color: C.textSub, fontSize: 14 }}>
            {busy ? 'Loading…' : 'No exports found. Go to Resume Flow → Export to create one.'}
          </p>
        )}

        {visible.map(e => (
          <div key={e.jobId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.grayL}`, flexWrap: 'wrap' }}>
            {/* Format badge */}
            <span style={pill(fmtColor(e.format))}>{e.format}</span>

            {/* Details */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Resume #{e.resumeId}</div>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                {new Date(e.createdAt).toLocaleString()} · ID: {e.jobId.slice(0, 8)}…
              </div>
            </div>

            {/* Status */}
            <span style={{ fontSize: 13, fontWeight: 700, color: statusColor(e.status) }}>
              {e.status === 'COMPLETED' ? '✓' : e.status === 'FAILED' ? '✕' : '⏳'} {e.status}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              {e.status === 'COMPLETED' && (
                <a href={exportApi.downloadUrl(e.jobId)}
                  style={{ ...btn(C.indigo), textDecoration: 'none', display: 'inline-block' }}>
                  ⬇ Download
                </a>
              )}
              <button style={btn(C.red)} onClick={() => del(e.jobId)} disabled={busy}>✕</button>
            </div>

            {/* Error */}
            {e.status === 'FAILED' && e.errorMessage && (
              <p style={{ width: '100%', margin: '4px 0 0', fontSize: 12, color: C.red }}>
                {e.errorMessage}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function pill(bg: string, fg = '#fff') {
  return { display: 'inline-block' as const, background: bg, color: fg, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 as const }
}
