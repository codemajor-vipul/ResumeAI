import { useState, useCallback } from 'react'
import { resumeApi, sectionApi, aiApi, exportApi } from '../api'
import type { Resume, Section, AiRequest, ExportJob } from '../types'
import { card, btn, input, textarea, select, row, C, errBox, pre, tabBtn, scoreColor } from '../styles'

const SECTION_TYPES = ['SUMMARY','EXPERIENCE','EDUCATION','SKILLS','CERTIFICATIONS','PROJECTS','LANGUAGES','CUSTOM']
const LANGUAGES = ['English','Spanish','French','German','Portuguese','Chinese','Arabic','Hindi','Japanese']

type Tab = 'resumes' | 'sections' | 'ai' | 'export'

export default function ResumeFlowPage() {
  const [tab, setTab] = useState<Tab>('resumes')
  const [activeResume, setActive] = useState<Resume | null>(null)
  const [resumes,  setResumes]  = useState<Resume[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [aiResult, setAiResult] = useState<AiRequest | null>(null)
  const [expJob,   setExpJob]   = useState<ExportJob | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setErr(''); setBusy(true)
    try { return await fn() }
    catch (e: any) { setErr(e?.response?.data?.error ?? e?.message ?? 'Error'); return null }
    finally { setBusy(false) }
  }, [])

  const loadResumes  = useCallback(() => run(async () => { const d = await resumeApi.getAll(); setResumes(d); return d }), [run])
  const loadSections = useCallback(() => run(async () => { if (!activeResume) return; const d = await sectionApi.getByResume(activeResume.resumeId); setSections(d); return d }), [run, activeResume])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'resumes',  label: '1️⃣ Resumes'  },
    { key: 'sections', label: '2️⃣ Sections' },
    { key: 'ai',       label: '3️⃣ AI'       },
    { key: 'export',   label: '4️⃣ Export'   },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>📄 Resume Builder</h2>
      {activeResume && (
        <p style={{ margin: '0 0 16px', color: C.textSub, fontSize: 13 }}>
          Active: <strong style={{ color: C.indigo }}>{activeResume.title}</strong>
          {' '}· ATS <strong style={{ color: scoreColor(activeResume.atsScore) }}>{activeResume.atsScore}%</strong>
          {' '}· {activeResume.isPublic ? '🌍 Public' : '🔒 Private'}
        </p>
      )}
      {!activeResume && <p style={{ margin: '0 0 16px', color: C.amber, fontSize: 13 }}>⚠️ Select or create a resume in Tab 1 first.</p>}

      <div style={{ ...row, marginBottom: 20 }}>
        {tabs.map(t => <button key={t.key} style={tabBtn(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {err && <div style={errBox}>{err}</div>}

      {tab === 'resumes'  && <ResumesTab  run={run} busy={busy} resumes={resumes} active={activeResume} setActive={setActive} load={loadResumes} />}
      {tab === 'sections' && <SectionsTab run={run} busy={busy} sections={sections} active={activeResume} load={loadSections} setSections={setSections} />}
      {tab === 'ai'       && <AiTab       run={run} busy={busy} active={activeResume} sections={sections} result={aiResult} setResult={setAiResult} loadSections={loadSections} />}
      {tab === 'export'   && <ExportTab   run={run} busy={busy} active={activeResume} job={expJob} setJob={setExpJob} />}
    </div>
  )
}

// ── Tab 1: Resumes ─────────────────────────────────────────────────────────────
function ResumesTab({ run, busy, resumes, active, setActive, load }: any) {
  const [title, setTitle] = useState('My Software Engineer Resume')
  const [job,   setJob]   = useState('Senior Software Engineer')
  const [tmpl,  setTmpl]  = useState('1')
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editJob,   setEditJob]   = useState('')

  const create = () => run(async () => {
    const r = await resumeApi.create({ title, targetJobTitle: job, templateId: Number(tmpl) })
    setActive(r); await load()
  })
  const duplicate = (r: Resume) => run(async () => { const c = await resumeApi.duplicate(r.resumeId); setActive(c); await load() })
  const publish   = (r: Resume) => run(async () => { const u = await (r.isPublic ? resumeApi.unpublish : resumeApi.publish)(r.resumeId); if (active?.resumeId === u.resumeId) setActive(u); await load() })
  const del       = (r: Resume) => run(async () => { await resumeApi.delete(r.resumeId); if (active?.resumeId === r.resumeId) setActive(null); await load() })
  const saveEdit  = (r: Resume) => run(async () => { const u = await resumeApi.update(r.resumeId, { title: editTitle, targetJobTitle: editJob }); if (active?.resumeId === u.resumeId) setActive(u); setEditId(null); await load() })

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 14px' }}>Create Resume</h3>
      <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Resume title" />
      <input style={input} value={job}   onChange={e => setJob(e.target.value)}   placeholder="Target job title" />
      <input style={input} value={tmpl}  onChange={e => setTmpl(e.target.value)}  placeholder="Template ID (from Templates page)" />
      <div style={row}>
        <button style={btn()} onClick={create} disabled={busy}>+ Create</button>
        <button style={btn(C.gray)} onClick={load} disabled={busy}>🔄 Load Mine</button>
      </div>

      {resumes.length > 0 && <hr style={{ margin: '12px 0', border: 'none', borderTop: `1px solid ${C.border}` }} />}

      {resumes.map((r: Resume) => (
        <div key={r.resumeId} style={{ padding: '8px 0', borderBottom: `1px solid ${C.grayL}` }}>
          {editId === r.resumeId ? (
            <div>
              <input style={{ ...input, marginBottom: 4 }} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              <input style={{ ...input, marginBottom: 4 }} value={editJob}   onChange={e => setEditJob(e.target.value)}   />
              <div style={row}>
                <button style={btn(C.green)} onClick={() => saveEdit(r)} disabled={busy}>Save</button>
                <button style={btn(C.gray)}  onClick={() => setEditId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 13 }}>{r.title}</strong>
                <span style={{ fontSize: 11, color: C.textSub, marginLeft: 6 }}>#{r.resumeId}</span>
                <div style={{ fontSize: 11, color: C.textSub }}>{r.targetJobTitle} · ATS: <span style={{ color: scoreColor(r.atsScore), fontWeight: 700 }}>{r.atsScore}%</span></div>
              </div>
              <button style={btn(active?.resumeId === r.resumeId ? C.green : C.indigo, '#fff')} onClick={() => setActive(r)}>
                {active?.resumeId === r.resumeId ? '✓ Active' : 'Select'}
              </button>
              <button style={btn(C.blue)}  onClick={() => { setEditId(r.resumeId); setEditTitle(r.title); setEditJob(r.targetJobTitle) }}>✏️</button>
              <button style={btn(C.amber)} onClick={() => duplicate(r)} disabled={busy}>⎘ Dup</button>
              <button style={btn(r.isPublic ? C.gray : C.sky)} onClick={() => publish(r)} disabled={busy}>{r.isPublic ? '🔒 Unpub' : '🌍 Pub'}</button>
              <button style={btn(C.red)}   onClick={() => del(r)} disabled={busy}>✕</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Tab 2: Sections ────────────────────────────────────────────────────────────
function SectionsTab({ run, busy, sections, active, load, setSections }: any) {
  const [sType,    setSType]   = useState('SUMMARY')
  const [sTitle,   setSTitle]  = useState('Professional Summary')
  const [sContent, setSContent]= useState('')
  const [editId,   setEditId]  = useState<number | null>(null)
  const [editData, setEditData]= useState({ title: '', content: '', isVisible: true })

  if (!active) return <div style={card}><p style={{ color: C.amber }}>⚠️ Select a resume first in Tab 1.</p></div>

  const addSection = () => run(async () => {
    await sectionApi.add({ resumeId: active.resumeId, sectionType: sType, title: sTitle, content: sContent, displayOrder: sections.length + 1 })
    setSContent(''); await load()
  })
  const del      = (id: number) => run(async () => { await sectionApi.delete(id); await load() })
  const toggle   = (id: number) => run(async () => { await sectionApi.toggleVisibility(id); await load() })
  const saveEdit = (id: number) => run(async () => { await sectionApi.update(id, editData); setEditId(null); await load() })
  const moveUp   = (i: number) => run(async () => {
    if (i === 0) return
    const ids = sections.map((s: Section) => s.sectionId)
    ;[ids[i-1], ids[i]] = [ids[i], ids[i-1]]
    await sectionApi.reorder(active.resumeId, ids); await load()
  })
  const moveDown = (i: number) => run(async () => {
    if (i === sections.length - 1) return
    const ids = sections.map((s: Section) => s.sectionId)
    ;[ids[i], ids[i+1]] = [ids[i+1], ids[i]]
    await sectionApi.reorder(active.resumeId, ids); await load()
  })

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 4px' }}>Sections — {active.title}</h3>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: C.textSub }}>{sections.length} section(s)</p>

      <select style={select} value={sType} onChange={e => setSType(e.target.value)}>
        {SECTION_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      <input style={input} value={sTitle} onChange={e => setSTitle(e.target.value)} placeholder="Section title" />
      <textarea style={textarea} value={sContent} onChange={e => setSContent(e.target.value)} placeholder="Content (paste AI output here!)" />
      <div style={row}>
        <button style={btn()} onClick={addSection} disabled={busy}>+ Add Section</button>
        <button style={btn(C.gray)} onClick={load} disabled={busy}>🔄 Reload</button>
      </div>

      {sections.map((s: Section, i: number) => (
        <div key={s.sectionId} style={{ borderBottom: `1px solid ${C.grayL}`, padding: '8px 0' }}>
          {editId === s.sectionId ? (
            <div>
              <input    style={{ ...input, marginBottom: 4 }}    value={editData.title}   onChange={e => setEditData(d => ({ ...d, title: e.target.value }))} />
              <textarea style={{ ...textarea, marginBottom: 4 }} value={editData.content} onChange={e => setEditData(d => ({ ...d, content: e.target.value }))} />
              <div style={row}>
                <button style={btn(C.green)} onClick={() => saveEdit(s.sectionId)} disabled={busy}>Save</button>
                <button style={btn(C.gray)}  onClick={() => setEditId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
                <button style={{ ...btn(C.gray), padding: '0 6px', fontSize: 10 }} onClick={() => moveUp(i)} disabled={i===0 || busy}>▲</button>
                <button style={{ ...btn(C.gray), padding: '0 6px', fontSize: 10 }} onClick={() => moveDown(i)} disabled={i===sections.length-1 || busy}>▼</button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                  <strong style={{ fontSize: 13, opacity: s.isVisible ? 1 : 0.45 }}>{s.title}</strong>
                  <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', borderRadius: 8, padding: '1px 6px' }}>{s.sectionType}</span>
                  {s.isAiGenerated && <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7c3aed', borderRadius: 8, padding: '1px 6px' }}>🤖 AI</span>}
                  {!s.isVisible && <span style={{ fontSize: 11, color: C.gray }}>hidden</span>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: C.textSub, whiteSpace: 'pre-wrap', opacity: s.isVisible ? 1 : 0.45 }}>
                  {s.content.slice(0, 100)}{s.content.length > 100 ? '…' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button style={btn(C.blue)}  onClick={() => { setEditId(s.sectionId); setEditData({ title: s.title, content: s.content, isVisible: s.isVisible }) }}>✏️</button>
                <button style={btn(s.isVisible ? C.amber : C.green)} onClick={() => toggle(s.sectionId)} disabled={busy}>{s.isVisible ? '👁' : '👁‍🗨'}</button>
                <button style={btn(C.red)}   onClick={() => del(s.sectionId)} disabled={busy}>✕</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Tab 3: AI ──────────────────────────────────────────────────────────────────
function AiTab({ run, busy, active, sections, result, setResult, loadSections }: any) {
  const [jobTitle, setJobTitle]   = useState('Senior Software Engineer')
  const [skills,   setSkills]     = useState('C#, .NET, React, PostgreSQL')
  const [yoe,      setYoe]        = useState('5')
  const [company,  setCompany]    = useState('Acme Corp')
  const [resps,    setResps]      = useState('Design scalable microservices, lead code reviews')
  const [jobDesc,  setJobDesc]    = useState('')
  const [sectionId,setSectionId]  = useState('')
  const [impGoal,  setImpGoal]    = useState('Make it more impactful and metrics-driven')
  const [lang,     setLang]       = useState('Spanish')

  if (!active) return <div style={card}><p style={{ color: C.amber }}>⚠️ Select a resume first in Tab 1.</p></div>

  const ai = async (fn: () => Promise<AiRequest>) => {
    const r = await run(fn)
    if (r) setResult(r)
  }

  const copyToSection = async () => {
    if (!result?.aiResponse) return
    await run(async () => {
      await sectionApi.add({ resumeId: active.resumeId, sectionType: 'CUSTOM', title: result.requestType, content: result.aiResponse, displayOrder: sections.length + 1 })
      await sectionApi.markAiGenerated(sections.length + 1)
      await loadSections()
    })
  }

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 4px' }}>AI Tools — {active.title}</h3>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: C.textSub }}>
        Free: Summary, Bullets, ATS Check, Skills.&nbsp;&nbsp;
        <span style={pill(C.indigo)}>PREMIUM</span>: Cover Letter, Improve, Tailor, Translate
      </p>

      {/* Common inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
        <input style={input} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Target job title" />
        <input style={input} value={yoe}      onChange={e => setYoe(e.target.value)}       placeholder="Years of experience" />
        <input style={input} value={skills}   onChange={e => setSkills(e.target.value)}    placeholder="Key skills (comma separated)" />
        <input style={input} value={company}  onChange={e => setCompany(e.target.value)}   placeholder="Company name" />
      </div>
      <textarea style={{ ...textarea, marginBottom: 4 }} value={jobDesc}  onChange={e => setJobDesc(e.target.value)}  placeholder="Paste job description for ATS / Cover Letter / Tailor…" />
      <textarea style={{ ...textarea, marginBottom: 4 }} value={resps}    onChange={e => setResps(e.target.value)}    placeholder="Responsibilities (for bullet generation)" />

      {/* Free tools */}
      <div style={row}>
        <button style={btn()} onClick={() => ai(() => aiApi.generateSummary({ resumeId: active.resumeId, jobTitle, yearsOfExperience: Number(yoe), keySkills: skills }))} disabled={busy}>
          ✨ Summary
        </button>
        <button style={btn(C.sky)} onClick={() => ai(() => aiApi.generateBullets({ resumeId: active.resumeId, jobTitle, companyName: company, responsibilities: resps }))} disabled={busy}>
          📝 Bullets
        </button>
        <button style={btn(C.blue)} onClick={() => ai(() => aiApi.checkAts({ resumeId: active.resumeId, jobDescription: jobDesc }))} disabled={busy}>
          🎯 ATS Check
        </button>
        <button style={btn(C.green)} onClick={() => ai(() => aiApi.suggestSkills({ resumeId: active.resumeId, targetJobTitle: jobTitle }))} disabled={busy}>
          💡 Skills
        </button>
      </div>

      {/* Premium tools */}
      <div style={{ ...row, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
        <span style={{ fontSize: 12, color: C.textSub, alignSelf: 'center' }}>⭐ Premium:</span>
        <button style={btn(C.indigo)} onClick={() => ai(() => aiApi.generateCoverLetter({ resumeId: active.resumeId, jobDescription: jobDesc, companyName: company }))} disabled={busy}>
          📬 Cover Letter
        </button>
        <button style={btn(C.purple)} onClick={() => ai(() => aiApi.tailorForJob({ resumeId: active.resumeId, jobTitle, jobDescription: jobDesc }))} disabled={busy}>
          🎯 Tailor
        </button>
      </div>

      {/* Improve section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <select style={{ ...select, marginBottom: 0 }} value={sectionId} onChange={e => setSectionId(e.target.value)}>
          <option value="">— pick section —</option>
          {sections.map((s: Section) => <option key={s.sectionId} value={s.sectionId}>{s.title}</option>)}
        </select>
        <input style={{ ...input, marginBottom: 0 }} value={impGoal} onChange={e => setImpGoal(e.target.value)} placeholder="Improvement goal" />
        <button style={btn(C.amber)} onClick={() => sectionId && ai(() => aiApi.improveSection({ resumeId: active.resumeId, sectionId: Number(sectionId), improvementGoal: impGoal }))} disabled={busy || !sectionId}>
          ✨ Improve
        </button>
      </div>

      {/* Translate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <select style={{ ...select, marginBottom: 0 }} value={lang} onChange={e => setLang(e.target.value)}>
          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>
        <button style={btn(C.sky)} onClick={() => ai(() => aiApi.translate({ resumeId: active.resumeId, targetLanguage: lang }))} disabled={busy}>
          🌐 Translate
        </button>
      </div>

      {/* Result */}
      {busy && <p style={{ fontSize: 13, color: C.textSub }}>🤖 AI thinking…</p>}
      {result && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
            <span style={pill(C.purple)}>{result.requestType}</span>
            <span style={{ fontSize: 12, color: C.textSub }}>Model: {result.model} · Tokens: {result.tokensUsed}</span>
            <button style={{ ...btn(C.green), marginLeft: 'auto' }} onClick={copyToSection}>+ Save to Section</button>
          </div>
          <pre style={pre}>{result.aiResponse}</pre>
        </div>
      )}
    </div>
  )
}

// ── Tab 4: Export ──────────────────────────────────────────────────────────────
function ExportTab({ run, busy, active, job, setJob }: any) {
  const [polling, setPolling] = useState(false)

  if (!active) return <div style={card}><p style={{ color: C.amber }}>⚠️ Select a resume first in Tab 1.</p></div>

  const doExport = async (fn: () => Promise<ExportJob>) => {
    const j = await run(fn); if (j) { setJob(j); autoPoll(j) }
  }

  const autoPoll = async (j: ExportJob) => {
    if (j.status === 'COMPLETED' || j.status === 'FAILED') return
    setPolling(true)
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const fresh = await exportApi.getStatus(j.jobId).catch(() => null)
      if (!fresh) break
      setJob(fresh)
      if (fresh.status === 'COMPLETED' || fresh.status === 'FAILED') break
    }
    setPolling(false)
  }

  const statusColor = (s: string) => s === 'COMPLETED' ? C.green : s === 'FAILED' ? C.red : C.amber

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 4px' }}>Export — {active.title}</h3>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: C.textSub }}>
        PDF is free. <span style={pill(C.indigo)}>PREMIUM</span>: DOCX, JSON.
      </p>

      <div style={row}>
        <button style={btn(C.red)}   onClick={() => doExport(() => exportApi.exportPdf(active.resumeId))}  disabled={busy}>📄 Export PDF</button>
        <button style={btn(C.blue)}  onClick={() => doExport(() => exportApi.exportDocx(active.resumeId))} disabled={busy}>📝 Export DOCX</button>
        <button style={btn(C.green)} onClick={() => doExport(() => exportApi.exportJson(active.resumeId))} disabled={busy}>📋 Export JSON</button>
      </div>

      {job && (
        <div style={{ background: C.grayL, borderRadius: 10, padding: '1rem', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={pill(job.format === 'PDF' ? C.red : job.format === 'DOCX' ? C.blue : C.green)}>{job.format}</span>
            <span style={{ fontWeight: 700, color: statusColor(job.status) }}>{job.status}</span>
            {polling && <span style={{ fontSize: 12, color: C.amber }}>⏳ auto-polling…</span>}
          </div>
          <p style={{ fontSize: 12, color: C.textSub, margin: '6px 0' }}>Job ID: <code>{job.jobId}</code></p>
          {job.status === 'COMPLETED' && (
            <a href={exportApi.downloadUrl(job.jobId)}
              style={{ ...btn(C.indigo), display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
              ⬇ Download {job.format}
            </a>
          )}
          {job.status === 'FAILED' && (
            <p style={{ color: C.red, fontSize: 13, margin: '6px 0' }}>❌ {job.errorMessage ?? 'Export failed'}</p>
          )}
        </div>
      )}
    </div>
  )
}

// re-export pill locally
function pill(bg: string, fg = '#fff') {
  return { display: 'inline-block' as const, background: bg, color: fg, borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600 as const }
}
