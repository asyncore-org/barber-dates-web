import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { AppLoader, AppLayout } from '@/components/layout'
import { AuthGuard } from '@/components/auth'

const AuthPage = lazy(() => import('@/pages/auth/AuthPage'))
const CalendarPage = lazy(() => import('@/pages/client/CalendarPage'))
const AppointmentsPage = lazy(() => import('@/pages/client/AppointmentsPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))

export default function App() {
  const { user, authChecked } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // On bootstrap completion: redirect authenticated users to their home route
  useEffect(() => {
    if (!authChecked || !user) return
    const clientDest = ['/calendar', '/appointments']
    const adminDest = ['/admin/dashboard', '/admin/settings']
    if (user.role === 'admin') {
      if (adminDest.includes(location.pathname)) return
      navigate('/admin/dashboard', { replace: true })
    } else {
      if (clientDest.includes(location.pathname)) return
      navigate('/calendar', { replace: true })
    }
  }, [authChecked, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked) return <AppLoader />

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/calendar"
          element={
            <AuthGuard role="client">
              <AppLayout><CalendarPage /></AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/appointments"
          element={
            <AuthGuard role="client">
              <AppLayout><AppointmentsPage /></AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AuthGuard role="admin">
              <AppLayout><DashboardPage /></AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AuthGuard role="admin">
              <AppLayout><SettingsPage /></AppLayout>
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
