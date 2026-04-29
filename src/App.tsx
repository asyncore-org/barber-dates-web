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
const AdminPanelPage = lazy(() => import('@/pages/super-admin/AdminPanelPage'))
const BarberPage = lazy(() => import('@/pages/barber/BarberPage'))

const HOME: Record<string, string> = {
  admin: '/super-admin',
  owner: '/admin/dashboard',
  barber: '/barber',
  client: '/calendar',
}

const KNOWN_PATHS = [
  '/calendar', '/appointments',
  '/admin/dashboard', '/admin/settings',
  '/super-admin', '/barber',
]

export default function App() {
  const { user, authChecked } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!authChecked || !user) return
    if (KNOWN_PATHS.includes(location.pathname)) return
    navigate(HOME[user.role] ?? '/calendar', { replace: true })
  }, [authChecked, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked) return <AppLoader />

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Client */}
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

        {/* Owner (admin bypasses AuthGuard) */}
        <Route
          path="/admin/dashboard"
          element={
            <AuthGuard role="owner">
              <AppLayout><DashboardPage /></AppLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AuthGuard role="owner">
              <AppLayout><SettingsPage /></AppLayout>
            </AuthGuard>
          }
        />

        {/* Barber */}
        <Route
          path="/barber"
          element={
            <AuthGuard role="barber">
              <AppLayout><BarberPage /></AppLayout>
            </AuthGuard>
          }
        />

        {/* Admin panel */}
        <Route
          path="/super-admin"
          element={
            <AuthGuard role="admin">
              <AppLayout><AdminPanelPage /></AppLayout>
            </AuthGuard>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
