import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { AppLoader } from '@/components/layout'
import { AuthGuard } from '@/components/auth'

const LandingPage = lazy(() => import('@/pages/public/LandingPage'))
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
    const target = user.role === 'admin' ? '/admin/dashboard' : '/calendar'
    if (location.pathname === target) return
    navigate(target, { replace: true })
  }, [authChecked, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked) return <AppLoader />

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/calendar"
          element={
            <AuthGuard role="client">
              <CalendarPage />
            </AuthGuard>
          }
        />
        <Route
          path="/appointments"
          element={
            <AuthGuard role="client">
              <AppointmentsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AuthGuard role="admin">
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AuthGuard role="admin">
              <SettingsPage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
