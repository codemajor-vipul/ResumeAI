import { useState } from 'react'
import { resumeApi, sectionApi, aiApi, exportApi } from '../api'

const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 16 }
const inp: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }
const btn = (c = '#6366f1'): React.CSSProperties => ({ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: c, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 })
const pre: React.CSSProperties = { background: '#1e1e2e', color: '#cdd6f4', borderRadius: 8, padding: '1rem', fontSize: 12, overflow: 'auto', maxHeight: 200, marginTop: 8 }

type Step = 'resume' | 'sections' | 'ai' | 'export'

export default function ResumeFlowPage() {
  const [step, setStep] = useState<Step>('resume')

  // Resume state
  const [resumes, setResumes]     = useState<any[]>([])
  const [activeResume, setActive] = useState<any>(null)
  const [rTitle, setRTitle]       = useState('My Software Engineer Resume')
  const [rJob, setRJob]           = useState('Senior Software Engineer')
  const [rTmpl, setRTmpl]         = useState('1')

  // Section state
  const [sections, setSections]   = useState<any[]>([])
  const [sType, setSType]         = useState('SUMMARY')
  const [sTitle, setSTitle]       = useState('Professional Summary')
  const [sContent, setSContent]   = useState('')

  // AI state
  const [aiResult, setAiResult]   = useState<any>(null)
  const [aiLoading, setAiLoad]    = useState(false)
  const [jobTitle, setJobTitle]   = useState('Senior Software Engineer')
  const [skills, setSkills]       = useState('C#, .NET, React, PostgreSQL')
  const [jobDesc, setJobDesc]     = useState('We need a senior .NET engineer...')

  // Export state
  const [exportJob, setExportJob] = useState<any>(null)

  const [err, setErr] = useState('')

  const run = async (fn: () => Promise<any>) => {
    setErr('')
    try { return await fn() }
    catch (e: any) { setErr(e?.response?.data?.error ?? e.message); return null }
  }

  // ── Resume actions ──
  const createResume = () => run(async () => {
    const r = await resumeApi.create({ title: rTitle, targetJobTitle: rJob, templateId: Number(rTmpl) })
    setActive(r); await loadResumes()
  })
  const loadResumes = () => run(async () => { const d = await resumeApi.getAll(); setResumes(d) })
  const deleteResume = (id: number) => run(async () => { await resumeApi.delete(id); await loadResumes(); if (activeResume?.resumeId === id) setActive(null) })

  // ── Section actions ──
  const addSection = () => run(async () => {
    await sectionApi.add({ resumeId: activeResume.resumeId, sectionType: sType, title: sTitle, content: sContent, displayOrder: sections.length + 1 })
    await loadSections()
  })
  const loadSections = () => run(async () => { const d = await sectionApi.getByResume(activeResume.resumeId); setSections(d) })
  const deleteSection = (id: number) => run(async () => { await sectionApi.delete(id); await loadSections() })

  // ── AI actions ──
  const genSummary = () => run(async () => { setAiLoad(true); const d = await aiApi.generateSummary({ resumeId: activeResume.resumeId, jobTitle, yearsOfExperience: 5, keySkills: skills }); setAiResult(d); setAiLoad(false) })
  const checkAts   = () => run(async () => { setAiLoad(true); const d = await aiApi.checkAts({ resumeId: activeResume.resumeId, jobDescription: jobDesc }); setAiResult(d); setAiLoad(false) })
  const suggestSkills = () => run(async () => { setAiLoad(true); const d = await aiApi.suggestSkills({ resumeId: activeResume.resumeId, targetJobTitle: jobTitle }); setAiResult(d); setAiLoad(false) })

  // ── Export actions ──
  const exportPdf  = () => run(async () => { const j = await exportApi.exportPdf(activeResume.resumeId); setExportJob(j) })
  const exportDocx = () => run(async () => { const j = await exportApi.exportDocx(activeResume.resumeId); setExportJob(j) })
  const pollStatus = () => run(async () => { const j = await exportApi.getStatus(exportJob.jobId); setExportJob(j) })

  const tabs: { key: Step; label: string }[] = [
    { key: 'resume',   label: '1️⃣ Resume' },
    { key: 'sections', label: '2️⃣ Sections' },
    { key: 'ai',       label: '3️⃣ AI' },
    { key: 'export',   label: '4️⃣ Export' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>📄 Resume Flow</h2>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
        Full E2E flow: Create resume → Add sections → Generate AI content → Export
      </p>

      {/* Step tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setStep(t.key)} style={{
            padding: '0.45rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: step === t.key ? '#6366f1' : '#e5e7eb',
            color: step === t.key ? '#fff' : '#374151', fontWeight: 600, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {/* ── Step 1: Resume ── */}
      {step === 'resume' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 16px' }}>Create / Select Resume</h3>
          <input style={inp} value={rTitle}  onChange={e => setRTitle(e.target.value)}  placeholder="Resume title" />
          <input style={inp} value={rJob}    onChange={e => setRJob(e.target.value)}    placeholder="Target job title" />
          <input style={inp} value={rTmpl}   onChange={e => setRTmpl(e.target.value)}   placeholder="Template ID (from Templates page)" />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button style={btn()} onClick={createResume}>+ Create Resume</button>
            <button style={btn('#6b7280')} onClick={loadResumes}>🔄 Load My Resumes</button>
          </div>
          {resumes.map((r: any) => (
            <div key={r.resumeId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ flex: 1 }}>
                <strong>{r.title}</strong>
                <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>#{r.resumeId} · ATS: {r.atsScore}</span>
              </div>
              <button style={btn(activeResume?.resumeId === r.resumeId ? '#22c55e' : '#6366f1')}
                onClick={() => setActive(r)}>
                {activeResume?.resumeId === r.resumeId ? '✓ Active' : 'Select'}
              </button>
              <button style={btn('#ef4444')} onClick={() => deleteResume(r.resumeId)}>Delete</button>
            </div>
          ))}
          {activeResume && <p style={{ marginTop: 12, fontSize: 13, color: '#22c55e' }}>✅ Active: <strong>{activeResume.title}</strong> — now go to Sections →</p>}
        </div>
      )}

      {/* ── Step 2: Sections ── */}
      {step === 'sections' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 4px' }}>Sections</h3>
          {!activeResume
            ? <p style={{ color: '#f59e0b', fontSize: 13 }}>⚠️ Select a resume first in Step 1.</p>
            : <>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Resume: <strong>{activeResume.title}</strong></p>
              <select style={inp} value={sType} onChange={e => setSType(e.target.value)}>
                {['SUMMARY','EXPERIENCE','EDUCATION','SKILLS','CERTIFICATIONS','PROJECTS','LANGUAGES','CUSTOM'].map(t => <option key={t}>{t}</option>)}
              </select>
              <input style={inp} value={sTitle} onChange={e => setSTitle(e.target.value)} placeholder="Section title" />
              <textarea style={{ ...inp, minHeight: 80 }} value={sContent} onChange={e => setSContent(e.target.value)} placeholder="Content (paste AI output here!)" />
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={btn()} onClick={addSection}>+ Add Section</button>
                <button style={btn('#6b7280')} onClick={loadSections}>🔄 Load Sections</button>
              </div>
              {sections.map((s: any) => (
                <div key={s.sectionId} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <strong>{s.title}</strong> <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', borderRadius: 8, padding: '1px 6px' }}>{s.sectionType}</span>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{s.content.slice(0, 120)}{s.content.length > 120 ? '…' : ''}</p>
                  </div>
                  <button style={btn('#ef4444')} onClick={() => deleteSection(s.sectionId)}>✕</button>
                </div>
              ))}
            </>}
        </div>
      )}

      {/* ── Step 3: AI ── */}
      {step === 'ai' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 4px' }}>AI Content Generation</h3>
          {!activeResume
            ? <p style={{ color: '#f59e0b', fontSize: 13 }}>⚠️ Select a resume first in Step 1.</p>
            : <>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Resume: <strong>{activeResume.title}</strong></p>
              <input style={inp} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Target job title" />
              <input style={inp} value={skills} onChange={e => setSkills(e.target.value)} placeholder="Key skills (comma separated)" />
              <textarea style={{ ...inp, minHeight: 60 }} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Paste job description for ATS check…" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button style={btn()} onClick={genSummary} disabled={aiLoading}>✨ Generate Summary</button>
                <button style={btn('#0ea5e9')} onClick={checkAts} disabled={aiLoading}>🎯 Check ATS</button>
                <button style={btn('#8b5cf6')} onClick={suggestSkills} disabled={aiLoading}>💡 Suggest Skills</button>
              </div>
              {aiLoading && <p style={{ color: '#6b7280', fontSize: 13 }}>Calling AI…</p>}
              {aiResult && (
                <>
                  <div style={{ fontSize: 13, marginBottom: 4, color: '#6b7280' }}>
                    Response · Model: <strong>{aiResult.model}</strong> · Tokens: <strong>{aiResult.tokensUsed}</strong> · Status: <strong>{aiResult.status}</strong>
                  </div>
                  <pre style={pre}>{aiResult.aiResponse}</pre>
                  <p style={{ fontSize: 12, color: '#22c55e', marginTop: 8 }}>👆 Copy the AI output and paste it as Section content in Step 2!</p>
                </>
              )}
            </>}
        </div>
      )}

      {/* ── Step 4: Export ── */}
      {step === 'export' && (
        <div style={card}>
          <h3 style={{ margin: '0 0 4px' }}>Export Resume</h3>
          {!activeResume
            ? <p style={{ color: '#f59e0b', fontSize: 13 }}>⚠️ Select a resume first in Step 1.</p>
            : <>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Resume: <strong>{activeResume.title}</strong></p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={btn('#ef4444')} onClick={exportPdf}>📄 Export PDF</button>
                <button style={btn('#2563eb')} onClick={exportDocx}>📝 Export DOCX</button>
              </div>
              {exportJob && (
                <>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    Job ID: <code>{exportJob.jobId}</code> ·
                    Status: <strong style={{ color: exportJob.status === 'COMPLETED' ? '#22c55e' : '#f59e0b' }}>{exportJob.status}</strong> ·
                    Format: {exportJob.format}
                  </div>
                  {exportJob.fileUrl && <p style={{ fontSize: 13 }}>📎 <a href={`/api/exports/${exportJob.jobId}/download`} style={{ color: '#6366f1' }}>Download file</a></p>}
                  {exportJob.status === 'QUEUED' || exportJob.status === 'PROCESSING'
                    ? <button style={btn('#6b7280')} onClick={pollStatus}>🔄 Poll Status</button>
                    : null}
                </>
              )}
            </>}
        </div>
      )}
    </div>
  )
}
