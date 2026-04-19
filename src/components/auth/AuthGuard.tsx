import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { UserRole } from '@/domain/user'
import { useAuth } from '@/hooks'

interface AuthGuardProps {
  role: UserRole
  children: ReactNode
}

export function AuthGuard({ role, children }: AuthGuardProps) {
  const { user, authChecked } = useAuth()

  // While session bootstrap is still running, App.tsx shows AppLoader — this is a safety net
  if (!authChecked) return null

  if (!user) return <Navigate to="/auth" replace />

  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/calendar'} replace />
  }

  return <>{children}</>
}
