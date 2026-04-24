import type { CSSProperties } from 'react'

// ─── Colour tokens ────────────────────────────────────────────────────────────
export const C = {
  indigo:  '#6366f1',
  indigoD: '#4f46e5',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  purple:  '#8b5cf6',
  sky:     '#0ea5e9',
  gray:    '#6b7280',
  grayL:   '#f3f4f6',
  white:   '#fff',
  text:    '#111827',
  textSub: '#6b7280',
  border:  '#e5e7eb',
}

// ─── Re-usable style objects ──────────────────────────────────────────────────
export const card: CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '1.5rem',
  boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 16,
}

export const input: CSSProperties = {
  width: '100%', padding: '0.55rem 0.8rem', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 13, marginBottom: 8,
  boxSizing: 'border-box', outline: 'none',
}

export const textarea: CSSProperties = {
  ...input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit',
}

export const row: CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center',
}

export const select: CSSProperties = { ...input }

// ─── Factory helpers ──────────────────────────────────────────────────────────
export function btn(bg = C.indigo, fg = '#fff'): CSSProperties {
  return {
    padding: '0.45rem 1rem', borderRadius: 8, border: 'none',
    background: bg, color: fg, fontWeight: 600, cursor: 'pointer',
    fontSize: 13, whiteSpace: 'nowrap',
  }
}

export function pill(bg = C.indigo, fg = '#fff'): CSSProperties {
  return {
    display: 'inline-block', background: bg, color: fg,
    borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
  }
}

export function scoreColor(s: number) {
  return s >= 80 ? C.green : s >= 60 ? C.amber : C.red
}

export const errBox: CSSProperties = {
  background: '#fef2f2', border: '1px solid #fca5a5',
  borderRadius: 8, padding: '0.6rem', color: C.red, fontSize: 13, marginBottom: 12,
}

export const pre: CSSProperties = {
  background: '#1e1e2e', color: '#cdd6f4', borderRadius: 8,
  padding: '1rem', fontSize: 12, overflow: 'auto', maxHeight: 220, marginTop: 8,
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
}

export const tabBtn = (active: boolean): CSSProperties => ({
  padding: '0.4rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer',
  background: active ? C.indigo : C.grayL,
  color: active ? '#fff' : C.text, fontWeight: 600, fontSize: 13,
})
