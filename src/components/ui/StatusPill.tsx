import type { CycleStatus, Role, SubmissionStatus } from '../../domain/types'
import { roleLabel } from '../../store/appStore'

const tone: Record<string, string> = {
  active: 'border-info/20 bg-info/10 text-info',
  draft: 'border-muted/20 bg-primary-tint text-muted',
  published: 'border-success/20 bg-success/10 text-success',
  closed: 'border-muted/20 bg-surface-raised text-muted',
  admin: 'border-primary/20 bg-primary-tint text-primary',
  focal_point: 'border-info/20 bg-info/10 text-info',
  performance_team: 'border-primary/20 bg-primary-tint text-primary',
  department_director: 'border-warning/20 bg-warning/10 text-warning',
  executive_director: 'border-success/20 bg-success/10 text-success',
  director_general: 'border-danger/20 bg-danger/10 text-danger',
  submitted: 'border-info/20 bg-info/10 text-info',
  submitted_to_performance_team: 'border-primary/20 bg-primary-tint text-primary',
  reviewed_by_performance_team: 'border-success/20 bg-success/10 text-success',
  with_performance_team: 'border-primary/20 bg-primary-tint text-primary',
  clarification_from_performance: 'border-warning/20 bg-warning/10 text-warning',
  clarification_focal: 'border-warning/20 bg-warning/10 text-warning',
  submitted_to_director: 'border-info/20 bg-info/10 text-info',
  reviewed_by_director: 'border-success/20 bg-success/10 text-success',
  clarification_from_director: 'border-warning/20 bg-warning/10 text-warning',
  clarification_director: 'border-warning/20 bg-warning/10 text-warning',
  approved_by_director: 'border-success/20 bg-success/10 text-success',
  director_approved: 'border-success/20 bg-success/10 text-success',
}

const labels: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  submitted: 'Submitted',
  submitted_to_performance_team: 'Submitted to Performance Team',
  reviewed_by_performance_team: 'Reviewed by Performance Team',
  with_performance_team: 'Submitted to Performance Team',
  clarification_from_performance: 'Clarification from Performance',
  clarification_focal: 'Clarification from Performance Team',
  submitted_to_director: 'Submitted to Department Director',
  reviewed_by_director: 'Reviewed by Director',
  clarification_from_director: 'Clarification from Director',
  clarification_director: 'Clarification from Department Director',
  approved_by_director: 'Approved by Director',
  director_approved: 'Approved by Department Director',
  published: 'Published',
}

interface StatusPillProps {
  value: Role | CycleStatus | SubmissionStatus
}

export function StatusPill({ value }: StatusPillProps) {
  const label = labels[value] ?? (value.includes('_') ? roleLabel(value as Role) : value[0].toUpperCase() + value.slice(1))
  return <span className={`status-pill ${tone[value] ?? 'border-border text-muted'}`}>{label}</span>
}
