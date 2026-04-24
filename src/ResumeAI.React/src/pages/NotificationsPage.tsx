/**
 * NotificationsPage
 *
 * Thin presenter — all state lives in NotificationContext (SignalR-backed).
 * New notifications arrive in real time without any polling or manual refresh.
 */
import { useNotifications } from '../context/NotificationContext'

const TYPE_COLOR: Record<string, string> = {
  ATS_COMPLETE:  '#22c55e',
  EXPORT_READY:  '#3b82f6',
  AI_DONE:       '#8b5cf6',
  JOB_MATCH:     '#f59e0b',
  PLAN_CHANGE:   '#6366f1',
  QUOTA_WARNING: '#ef4444',
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  connected:    { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
  connecting:   { background: '#fef9c3', color: '#713f12', border: '1px solid #fde047' },
  reconnecting: { background: '#fef9c3', color: '#713f12', border: '1px solid #fde047' },
  disconnected: { background: '#fef2f2', color: '#7f1d1d', border: '1px solid #fca5a5' },
}

const STATUS_LABEL: Record<string, string> = {
  connected:    '🟢 Live — notifications arrive in real time',
  connecting:   '🟡 Connecting to notification hub…',
  reconnecting: '🟡 Reconnecting…',
  disconnected: '🔴 Offline — showing last known notifications',
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '1.5rem',
  boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 16,
}

const btn = (c = '#6366f1'): React.CSSProperties => ({
  padding: '0.45rem 1rem', borderRadius: 8, border: 'none',
  background: c, color: '#fff', fontWeight: 600,
  cursor: 'pointer', fontSize: 13, marginRight: 8,
})

export default function NotificationsPage() {
  const {
    notifications, unreadCount, connectionStatus,
    markRead, markAll, remove, refresh,
  } = useNotifications()

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>🔔 Notifications</h2>
      <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>
        Real-time feed powered by SignalR. New notifications appear instantly — no refresh needed.
      </p>

      {/* Connection status pill */}
      <div style={{
        ...STATUS_STYLE[connectionStatus],
        borderRadius: 8, padding: '0.5rem 0.9rem',
        fontSize: 13, marginBottom: 20, display: 'inline-block',
      }}>
        {STATUS_LABEL[connectionStatus]}
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>
          {unreadCount > 0
            ? <span style={{ background: '#ef4444', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 14 }}>{unreadCount} unread</span>
            : <span style={{ color: '#22c55e' }}>All caught up ✅</span>}
        </span>
        <button style={btn()} onClick={refresh}>🔄 Refresh</button>
        {unreadCount > 0 && (
          <button style={btn('#6b7280')} onClick={markAll}>✓ Mark all read</button>
        )}
      </div>

      {/* Notification list */}
      <div style={card}>
        {notifications.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            No notifications yet. They will appear here — and as toasts — when AI tasks,
            exports, or job matches complete.
          </p>
        )}

        {notifications.map(n => (
          <div key={n.notificationId} style={{
            display: 'flex', gap: 12, padding: '0.75rem 0',
            borderBottom: '1px solid #f3f4f6',
            opacity: n.isRead ? 0.55 : 1,
            transition: 'opacity .2s',
          }}>
            {/* Colour accent bar */}
            <div style={{
              width: 5, flexShrink: 0, borderRadius: 3,
              background: n.isRead ? '#e5e7eb' : (TYPE_COLOR[n.type] ?? '#6366f1'),
            }} />

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>{n.title}</strong>
                <span style={{
                  fontSize: 11, borderRadius: 8, padding: '1px 6px',
                  background: TYPE_COLOR[n.type] ?? '#6366f1', color: '#fff',
                }}>
                  {n.type}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                  {n.channel}
                </span>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>{n.message}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                {new Date(n.sentAt).toLocaleString()}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.notificationId)}
                  style={{
                    padding: '0.25rem 0.6rem', borderRadius: 6,
                    border: '1px solid #d1d5db', background: '#fff',
                    cursor: 'pointer', fontSize: 12,
                  }}>
                  ✓ Read
                </button>
              )}
              <button
                onClick={() => remove(n.notificationId)}
                style={{
                  padding: '0.25rem 0.6rem', borderRadius: 6,
                  border: 'none', background: '#fef2f2',
                  color: '#dc2626', cursor: 'pointer', fontSize: 12,
                }}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
