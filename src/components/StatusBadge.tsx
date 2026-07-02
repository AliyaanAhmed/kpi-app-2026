import type { WorkstreamStatus } from '../domain/kpi'

const statusClassName: Record<WorkstreamStatus['status'], string> = {
  'On Track': 'badge badge-success',
  Watch: 'badge badge-warning',
  'At Risk': 'badge badge-danger',
}

interface StatusBadgeProps {
  status: WorkstreamStatus['status']
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={statusClassName[status]}>{status}</span>
}
