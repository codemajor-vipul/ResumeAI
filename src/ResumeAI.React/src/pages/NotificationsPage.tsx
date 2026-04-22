import { useEffect, useState } from 'react'
import { notifApi } from '../api'

const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 16 }
const btn = (c = '#6366f1'): React.CSSProperties => ({ padding: '0.45rem 1rem', borderRadius: 8, border: 'none', background: c, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, marginRight: 8 })

const typeColor: Record<string, string> = {
  ATS_COMPLETE: '#22c55e', EXPORT_READY: '#3b82f6', AI_DONE: '#8b5cf6',
  JOB_MATCH: '#f59e0b', PLAN_CHANGE: '#6366f1', QUOTA_WARNING: '#ef4444',
}

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState<any[]>([])
  const [unread, setUnread]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const [n, u] = await Promise.all([notifApi.getAll(), notifApi.unreadCount()])
      setNotifs(n); setUnread(u)
    } catch (e: any) { setErr(e?.response?.data?.error ?? e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id: number) => {
    await notifApi.markRead(id)
    setNotifs(prev => prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  const markAll = async () => {
    await notifApi.markAllRead()
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnread(0)
  }

  const del = async (id: number) => {
    await notifApi.delete(id)
    setNotifs(prev => prev.filter(n => n.notificationId !== id))
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>🔔 Notifications</h2>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
        Real-time notification feed. SignalR badge updates live when services fire events.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 20 }}>
          {unread > 0
            ? <span style={{ background: '#ef4444', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 14 }}>{unread} unread</span>
            : <span style={{ color: '#22c55e' }}>All caught up! ✅</span>}
        </span>
        <button style={btn()} onClick={load} disabled={loading}>🔄 Refresh</button>
        {unread > 0 && <button style={btn('#6b7280')} onClick={markAll}>✓ Mark all read</button>}
      </div>

      {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.6rem', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div style={card}>
        {loading && <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>}
        {!loading && notifs.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            No notifications yet. Notifications are generated when AI tasks, exports, or job matches complete.
          </p>
        )}
        {notifs.map((n: any) => (
          <div key={n.notificationId} style={{
            display: 'flex', gap: 12, padding: '0.75rem 0',
            borderBottom: '1px solid #f3f4f6',
            opacity: n.isRead ? 0.6 : 1,
          }}>
            <div style={{ width: 6, background: n.isRead ? '#e5e7eb' : (typeColor[n.type] ?? '#6366f1'), borderRadius: 3, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <strong style={{ fontSize: 14 }}>{n.title}</strong>
                <span style={{ fontSize: 11, background: typeColor[n.type] ?? '#6366f1', color: '#fff', borderRadius: 8, padding: '1px 6px' }}>{n.type}</span>
                <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>{n.channel}</span>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>{n.message}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{new Date(n.sentAt).toLocaleString()}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {!n.isRead && (
                <button onClick={() => markRead(n.notificationId)}
                  style={{ padding: '0.25rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                  ✓ Read
                </button>
              )}
              <button onClick={() => del(n.notificationId)}
                style={{ padding: '0.25rem 0.6rem', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
