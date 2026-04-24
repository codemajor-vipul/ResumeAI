import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import ToastContainer from './ToastContainer'

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  connected:    { color: '#22c55e', label: 'Live' },
  connecting:   { color: '#f59e0b', label: 'Connecting…' },
  reconnecting: { color: '#f59e0b', label: 'Reconnecting…' },
  disconnected: { color: '#ef4444', label: 'Offline' },
}

export default function Layout() {
  const { user, logout }                  = useAuth()
  const { unreadCount, connectionStatus } = useNotifications()
  const navigate                          = useNavigate()

  const handleLogout = () => { logout(); navigate('/auth') }
  const dot = STATUS_DOT[connectionStatus]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#1e1e2e', color: '#cdd6f4',
        padding: '1.5rem 0', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid #313244' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#cba6f7' }}>⚡ ResumeAI</div>
          <div style={{ fontSize: 12, color: '#a6adc8', marginTop: 4 }}>E2E Test Client</div>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <NavItem to="/" end label="🏠 Dashboard" />
          <NavItem to="/templates"  label="🎨 Templates"   />
          <NavItem to="/resume"     label="📄 Resume Flow" />
          <NavItem to="/jobmatch"   label="🎯 Job Match"   />
          <NavItem to="/exports"    label="📦 Exports"      />
          <NavItem to="/profile"    label="👤 Profile"      />

          {/* Notifications — live unread badge */}
          <NavLink to="/notifications"
            style={({ isActive }) => navStyle(isActive)}>
            <span style={{ flex: 1 }}>🔔 Notifications</span>
            {unreadCount > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff',
                borderRadius: 10, fontSize: 11, fontWeight: 700,
                padding: '1px 7px', minWidth: 18, textAlign: 'center',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* User info + SignalR status dot */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #313244', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: dot.color, flexShrink: 0,
            }} />
            <span style={{ color: '#6c7086', fontSize: 11 }}>{dot.label}</span>
          </div>
          <div style={{ color: '#a6adc8', marginBottom: 4 }}>👤 {user?.fullName}</div>
          <div style={{ color: '#6c7086', fontSize: 11, marginBottom: 8 }}>
            {user?.subscriptionPlan} · {user?.role}
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.4rem', background: '#f38ba8',
            border: 'none', borderRadius: 6, color: '#1e1e2e',
            cursor: 'pointer', fontWeight: 600,
          }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f5f5fa', overflowY: 'auto' }}>
        <Outlet />
      </main>

      {/* Toast portal — always on top */}
      <ToastContainer />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function navStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '0.6rem 1.25rem',
    color:       isActive ? '#cba6f7' : '#cdd6f4',
    background:  isActive ? '#313244' : 'transparent',
    textDecoration: 'none', fontSize: 14,
    borderLeft: isActive ? '3px solid #cba6f7' : '3px solid transparent',
  }
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} style={({ isActive }) => navStyle(isActive)}>
      {label}
    </NavLink>
  )
}
