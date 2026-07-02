import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import type { Role } from '../../domain/types'
import { useAppStore } from '../../store/appStore'

export function RouteGuard({ roles, children }: { roles: Role[]; children: ReactElement }) {
  const { data, activeUserId } = useAppStore()
  const user = data.users.find((item) => item.id === activeUserId)
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}
