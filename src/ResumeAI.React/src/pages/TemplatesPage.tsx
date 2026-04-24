import { useEffect, useState } from 'react'
import { templateApi } from '../api'
import type { Template, TemplatePreview, TemplateCategory } from '../types'
import { card, btn, C, tabBtn, errBox } from '../styles'

const CATEGORIES: TemplateCategory[] = [
  'PROFESSIONAL', 'CREATIVE', 'MODERN', 'TECHNICAL', 'ACADEMIC', 'MINIMAL',
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected,  setSelected]  = useState<Template | null>(null)
  const [preview,   setPreview]   = useState<TemplatePreview | null>(null)
  const [tab,       setTab]       = useState<'all' | 'free' | 'premium' | 'popular' | TemplateCategory>('all')
  const [loading,   setLoading]   = useState(false)
  const [prevLoading, setPrevLoad] = useState(false)
  const [err,       setErr]       = useState('')

  const load = async (t: typeof tab) => {
    setLoading(true); setTab(t); setErr('')
    try {
      let data: Template[]
      if      (t === 'all')     data = await templateApi.getAll()
      else if (t === 'free')    data = await templateApi.getFree()
      else if (t === 'premium') data = await templateApi.getPremium()
      else if (t === 'popular') data = await templateApi.getPopular(12)
      else                      data = await templateApi.getByCategory(t)
      setTemplates(data)
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? 'Failed to load templates')
    } finally { setLoading(false) }
  }

  useEffect(() => { load('all') }, [])

  const selectTemplate = async (t: Template) => {
    setSelected(t); setPreview(null); setPrevLoad(true)
    try {
      const p = await templateApi.getPreview(t.templateId)
      setPreview(p)
    } catch { /* preview may not exist for all templates */ }
    finally { setPrevLoad(false) }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>🎨 Templates</h2>
      <p style={{ margin: '0 0 20px', color: C.textSub, fontSize: 14 }}>
        Choose a resume template. Use the template ID when creating a resume.
      </p>

      {/* Primary tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {(['all', 'free', 'premium', 'popular'] as const).map(t => (
          <button key={t} style={tabBtn(tab === t)} onClick={() => load(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: C.textSub, alignSelf: 'center', marginRight: 4 }}>Category:</span>
        {CATEGORIES.map(cat => (
          <button key={cat} style={{ ...tabBtn(tab === cat), padding: '0.25rem 0.7rem', fontSize: 11 }}
            onClick={() => load(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {err && <div style={errBox}>{err}</div>}
      {loading && <p style={{ color: C.textSub }}>Loading templates…</p>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Template grid */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexWrap: 'wrap', gap: 14, maxWidth: 560 }}>
          {templates.map(t => (
            <TemplateCard
              key={t.templateId}
              template={t}
              isSelected={selected?.templateId === t.templateId}
              onClick={() => selectTemplate(t)}
            />
          ))}
          {!loading && templates.length === 0 && (
            <p style={{ color: C.textSub, fontSize: 14 }}>No templates in this filter.</p>
          )}
        </div>

        {/* Detail + Preview panel */}
        {selected && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{selected.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>{selected.description}</p>
                </div>
                <button style={btn(C.gray, '#fff')} onClick={() => { setSelected(null); setPreview(null) }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 12 }}>
                <span style={pill(selected.isPremium ? C.indigo : C.green)}>
                  {selected.isPremium ? '⭐ PREMIUM' : '✓ FREE'}
                </span>
                <span style={pill(C.blue)}>{selected.category}</span>
                <span style={{ color: C.textSub, alignSelf: 'center' }}>
                  {selected.usageCount.toLocaleString()} uses
                </span>
                <span style={{ color: C.textSub, alignSelf: 'center' }}>
                  ID: <strong>{selected.templateId}</strong>
                </span>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.6rem', fontSize: 13, marginBottom: 12 }}>
                💡 Use <strong>Template ID {selected.templateId}</strong> in Resume Flow → Create Resume
              </div>

              {/* Live preview */}
              <div>
                <strong style={{ fontSize: 13 }}>Live Preview</strong>
                {prevLoading && <p style={{ fontSize: 13, color: C.textSub }}>Loading preview…</p>}
                {!prevLoading && preview && (
                  <iframe
                    title="Template Preview"
                    srcDoc={`<!DOCTYPE html><html><head><style>${preview.cssStyles}</style></head><body>${preview.htmlLayout}</body></html>`}
                    style={{
                      width: '100%', height: 420, border: '1px solid #e5e7eb',
                      borderRadius: 8, marginTop: 8, background: '#fff',
                    }}
                    sandbox="allow-same-origin"
                  />
                )}
                {!prevLoading && !preview && (
                  <p style={{ fontSize: 12, color: C.textSub, marginTop: 8 }}>
                    No preview available for this template.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Template card ──────────────────────────────────────────────────────────────

function TemplateCard({ template: t, isSelected, onClick }: {
  template: Template; isSelected: boolean; onClick: () => void
}) {
  return (
    <div onClick={onClick} style={{
      width: 170, background: isSelected ? '#f0f0ff' : '#fafafa',
      border: `2px solid ${isSelected ? C.indigo : C.border}`,
      borderRadius: 10, padding: '1rem', cursor: 'pointer',
      transition: 'border .15s, background .15s',
    }}>
      {/* Mock thumbnail */}
      <div style={{
        height: 100, background: isSelected ? '#e0e7ff' : '#f3f4f6',
        borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 28,
      }}>
        {t.category === 'CREATIVE' ? '🎨' : t.category === 'TECHNICAL' ? '⚙️' :
         t.category === 'ACADEMIC' ? '🎓' : t.category === 'MODERN' ? '✨' :
         t.category === 'MINIMAL'  ? '🪶' : '💼'}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.name}</div>
      <div style={{ fontSize: 11, color: C.textSub, marginBottom: 6 }}>{t.category}</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={pill(t.isPremium ? C.indigo : C.green, '#fff', 10)}>
          {t.isPremium ? '⭐' : '✓'} {t.isPremium ? 'PRO' : 'FREE'}
        </span>
      </div>
    </div>
  )
}

// tiny overload so pill can take optional fontSize
function pill(bg: string, fg = '#fff', fs = 12) {
  return {
    display: 'inline-block', background: bg, color: fg,
    borderRadius: 20, padding: '2px 8px', fontSize: fs, fontWeight: 600,
  }
}
