import { useEffect, useState } from 'react'
import { templateApi } from '../api'

const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 16 }
const tCard: React.CSSProperties = { background: '#f8f7ff', border: '1px solid #e0e0ef', borderRadius: 10, padding: '1rem', width: 200 }

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [selected, setSelected]  = useState<any>(null)
  const [tab, setTab]            = useState<'all' | 'free' | 'popular'>('all')
  const [loading, setLoading]    = useState(false)

  const load = async (t: typeof tab) => {
    setLoading(true); setTab(t)
    try {
      const data = t === 'all'     ? await templateApi.getAll()
                 : t === 'free'    ? await templateApi.getFree()
                 : await templateApi.getPopular(8)
      setTemplates(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load('all') }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>🎨 Templates</h2>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
        Browse available resume templates. Select one to use when creating a resume.
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'free', 'popular'] as const).map(t => (
          <button key={t} onClick={() => load(t)} style={{
            padding: '0.4rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: tab === t ? '#6366f1' : '#e5e7eb',
            color: tab === t ? '#fff' : '#374151', fontWeight: 600, fontSize: 13,
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        {templates.map((t: any) => (
          <div key={t.templateId} style={{
            ...tCard,
            border: selected?.templateId === t.templateId ? '2px solid #6366f1' : tCard.border,
            cursor: 'pointer',
          }} onClick={() => setSelected(t)}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{t.category}</div>
            <div style={{ fontSize: 12 }}>
              {t.isPremium
                ? <span style={{ background: '#6366f1', color: '#fff', borderRadius: 10, padding: '1px 8px' }}>PREMIUM</span>
                : <span style={{ background: '#22c55e', color: '#fff', borderRadius: 10, padding: '1px 8px' }}>FREE</span>}
              {'  '}{t.usageCount} uses
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px' }}>Selected: {selected.name}</h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>{selected.description}</p>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Template ID: <strong>{selected.templateId}</strong> — copy this ID to use when creating a Resume on the Resume Flow page.
          </div>
        </div>
      )}

      {templates.length === 0 && !loading && (
        <div style={card}>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            No templates found. Make sure the <code>template</code> service is running and seeded.
          </p>
        </div>
      )}
    </div>
  )
}
