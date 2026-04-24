/**
 * ToastContainer
 *
 * Renders the current toast queue from NotificationContext in the top-right
 * corner. Each toast auto-dismisses after 5 s (timer lives in the context).
 * Has role="alert" for screen-reader accessibility (WCAG 2.2 AA).
 */
import { useNotifications } from '../context/NotificationContext'

const TYPE_ICON: Record<string, string> = {
  AI_DONE:       '✨',
  ATS_COMPLETE:  '✅',
  EXPORT_READY:  '📄',
  JOB_MATCH:     '🎯',
  PLAN_CHANGE:   '💳',
  QUOTA_WARNING: '⚠️',
}

const TYPE_COLOR: Record<string, string> = {
  AI_DONE:       '#8b5cf6',
  ATS_COMPLETE:  '#22c55e',
  EXPORT_READY:  '#3b82f6',
  JOB_MATCH:     '#f59e0b',
  PLAN_CHANGE:   '#6366f1',
  QUOTA_WARNING: '#ef4444',
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div style={{
      position:      'fixed',
      top:           20,
      right:         20,
      zIndex:        9999,
      display:       'flex',
      flexDirection: 'column',
      gap:           10,
      pointerEvents: 'none',   // let clicks pass through the gap between toasts
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          aria-live="assertive"
          style={{
            pointerEvents:   'all',
            background:      '#1e1e2e',
            color:           '#cdd6f4',
            border:          `1px solid ${TYPE_COLOR[t.type] ?? '#6366f1'}`,
            borderLeft:      `4px solid ${TYPE_COLOR[t.type] ?? '#6366f1'}`,
            borderRadius:    10,
            padding:         '0.75rem 1rem',
            minWidth:        280,
            maxWidth:        360,
            boxShadow:       '0 4px 20px rgba(0,0,0,.35)',
            display:         'flex',
            gap:             10,
            alignItems:      'flex-start',
            animation:       'toastIn 0.25s ease',
          }}
        >
          {/* Icon */}
          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
            {TYPE_ICON[t.type] ?? '🔔'}
          </span>

          {/* Body */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: '#a6adc8', lineHeight: 1.4 }}>{t.message}</div>
          </div>

          {/* Close button */}
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            style={{
              background:  'none',
              border:      'none',
              color:       '#6c7086',
              cursor:      'pointer',
              fontSize:    16,
              lineHeight:  1,
              flexShrink:  0,
              padding:     0,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Keyframe injected once via a style tag */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  )
}
