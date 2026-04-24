import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import DashboardPage from './pages/DashboardPage'
import TemplatesPage from './pages/TemplatesPage'
import ResumeFlowPage from './pages/ResumeFlowPage'
import JobMatchPage from './pages/JobMatchPage'
import NotificationsPage from './pages/NotificationsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      {/* OAuth redirect landing — must be outside PrivateRoute */}
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route path="/" element={<PrivateRoute><NotificationProvider><Layout /></NotificationProvider></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="resume" element={<ResumeFlowPage />} />
        <Route path="jobmatch" element={<JobMatchPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
