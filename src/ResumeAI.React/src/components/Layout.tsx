import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/',             label: '🏠 Dashboard'     },
  { to: '/templates',    label: '🎨 Templates'      },
  { to: '/resume',       label: '📄 Resume Flow'    },
  { to: '/jobmatch',     label: '🎯 Job Match'      },
  { to: '/notifications',label: '🔔 Notifications'  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/auth') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1e1e2e', color: '#cdd6f4', padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid #313244' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#cba6f7' }}>⚡ ResumeAI</div>
          <div style={{ fontSize: 12, color: '#a6adc8', marginTop: 4 }}>E2E Test Client</div>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {nav.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'block', padding: '0.6rem 1.25rem',
                color: isActive ? '#cba6f7' : '#cdd6f4',
                background: isActive ? '#313244' : 'transparent',
                textDecoration: 'none', fontSize: 14,
                borderLeft: isActive ? '3px solid #cba6f7' : '3px solid transparent',
              })}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #313244', fontSize: 13 }}>
          <div style={{ color: '#a6adc8', marginBottom: 4 }}>👤 {user?.fullName}</div>
          <div style={{ color: '#6c7086', fontSize: 11, marginBottom: 8 }}>
            {user?.subscriptionPlan} · {user?.role}
          </div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '0.4rem', background: '#f38ba8', border: 'none', borderRadius: 6, color: '#1e1e2e', cursor: 'pointer', fontWeight: 600 }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f5f5fa', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
