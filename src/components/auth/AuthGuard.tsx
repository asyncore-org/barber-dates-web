import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { UserRole } from '@/domain/user'
import { useAuth } from '@/hooks'

interface AuthGuardProps {
  role: UserRole
  children: ReactNode
}

function homeFor(role: UserRole | undefined): string {
  if (role === 'admin') return '/super-admin'
  if (role === 'owner') return '/admin/dashboard'
  if (role === 'barber') return '/barber'
  return '/calendar'
}

export function AuthGuard({ role, children }: AuthGuardProps) {
  const { user, authChecked } = useAuth()

  if (!authChecked) return null
  if (!user) return <Navigate to="/auth" replace />

  // admin bypasses all guards — can access any route
  if (user.role === 'admin') return <>{children}</>

  if (user.role !== role) {
    return <Navigate to={homeFor(user.role)} replace />
  }

  return <>{children}</>
}
