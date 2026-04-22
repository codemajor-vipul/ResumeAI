import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { aiApi, notifApi } from '../api'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '1.5rem',
  boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 16,
}
const badge = (color: string): React.CSSProperties => ({
  display: 'inline-block', background: color, color: '#fff',
  borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
})

export default function DashboardPage() {
  const { user } = useAuth()
  const [quota, setQuota]   = useState<any>(null)
  const [unread, setUnread] = useState(0)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    aiApi.getQuota().then(setQuota).catch(() => {})
    notifApi.unreadCount().then((n: any) => setUnread(n)).catch(() => {})
    aiApi.getHistory().then(setHistory).catch(() => {})
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>🏠 Dashboard</h2>

      {/* User card */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>👤 Account</h3>
        <table style={{ fontSize: 14, borderCollapse: 'collapse', width: '100%' }}>
          {[
            ['Name',  user?.fullName],
            ['Email', user?.email],
            ['Role',  user?.role],
            ['Plan',  <span style={badge(user?.subscriptionPlan === 'PREMIUM' ? '#6366f1' : '#6b7280')}>{user?.subscriptionPlan}</span>],
          ].map(([k, v]) => (
            <tr key={String(k)}>
              <td style={{ padding: '4px 12px 4px 0', color: '#6b7280', width: 80 }}>{k}</td>
              <td style={{ padding: '4px 0' }}>{v as any}</td>
            </tr>
          ))}
        </table>
      </div>

      {/* Quota */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>🤖 AI Quota</h3>
        {quota ? (
          <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
            <div><strong>{quota.remainingContentCalls}</strong> / {quota.maxContentCalls} content calls left</div>
            <div><strong>{quota.remainingAtsCalls}</strong> / {quota.maxAtsCalls} ATS calls left</div>
          </div>
        ) : <p style={{ color: '#6b7280', fontSize: 14 }}>Loading quota…</p>}
      </div>

      {/* Notifications badge */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>🔔 Notifications</h3>
        <p style={{ fontSize: 14 }}>
          You have <span style={badge('#ef4444')}>{unread}</span> unread notifications.
        </p>
      </div>

      {/* AI History */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px' }}>📋 Recent AI Requests</h3>
        {history.length === 0
          ? <p style={{ color: '#6b7280', fontSize: 14 }}>No AI requests yet. Go to Resume Flow to generate content!</p>
          : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Type', 'Model', 'Tokens', 'Status', 'Created'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((r: any) => (
                  <tr key={r.requestId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 8px' }}>{r.requestType}</td>
                    <td style={{ padding: '6px 8px' }}>{r.model}</td>
                    <td style={{ padding: '6px 8px' }}>{r.tokensUsed}</td>
                    <td style={{ padding: '6px 8px' }}><span style={badge(r.status === 'COMPLETED' ? '#22c55e' : '#f59e0b')}>{r.status}</span></td>
                    <td style={{ padding: '6px 8px', color: '#6b7280' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
