import type { CycleStatus, Role, SubmissionStatus } from '../../domain/types'
import { roleLabel } from '../../store/appStore'

const tone: Record<string, string> = {
  active: 'border-[#B9E6FF] bg-[#E7F5FF] text-[#1468A8] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  draft: 'border-[#CFE0FF] bg-[#E7F5FF] text-[#286CFF] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  published: 'border-[#BFE8CC] bg-[#EAF8EF] text-[#237A3A] dark:border-[#2F7A47] dark:bg-[#123A26] dark:text-[#BBF7D0]',
  closed: 'border-[#D8DEE8] bg-[#F1F5F9] text-[#64748B] dark:border-slate-500/50 dark:bg-slate-700/40 dark:text-slate-200',
  admin: 'border-[#CFE0FF] bg-[#E7F5FF] text-[#286CFF] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  focal_point: 'border-[#B9E6FF] bg-[#E7F5FF] text-[#1468A8] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  performance_team: 'border-[#CFE0FF] bg-[#E7F5FF] text-[#286CFF] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  department_director: 'border-[#F8DCA6] bg-[#FFF7E6] text-[#A26000] dark:border-[#926C25] dark:bg-[#3D2A11] dark:text-[#FDE68A]',
  executive_director: 'border-[#BFE8CC] bg-[#EAF8EF] text-[#237A3A] dark:border-[#2F7A47] dark:bg-[#123A26] dark:text-[#BBF7D0]',
  director_general: 'border-[#F5C1C7] bg-[#FFF0F2] text-[#B42336] dark:border-[#8B3A44] dark:bg-[#3F151C] dark:text-[#FECACA]',
  submitted: 'border-[#B9E6FF] bg-[#E7F5FF] text-[#1468A8] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  submitted_to_performance_team: 'border-[#CFE0FF] bg-[#E7F5FF] text-[#286CFF] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  reviewed_by_performance_team: 'border-[#BFE8CC] bg-[#EAF8EF] text-[#237A3A] dark:border-[#2F7A47] dark:bg-[#123A26] dark:text-[#BBF7D0]',
  with_performance_team: 'border-[#CFE0FF] bg-[#E7F5FF] text-[#286CFF] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  clarification_from_performance: 'border-[#F8DCA6] bg-[#FFF7E6] text-[#A26000] dark:border-[#926C25] dark:bg-[#3D2A11] dark:text-[#FDE68A]',
  clarification_focal: 'border-[#F8DCA6] bg-[#FFF7E6] text-[#A26000] dark:border-[#926C25] dark:bg-[#3D2A11] dark:text-[#FDE68A]',
  submitted_to_director: 'border-[#B9E6FF] bg-[#E7F5FF] text-[#1468A8] dark:border-[#4D73B8] dark:bg-[#1E3A68] dark:text-[#DBEAFE]',
  reviewed_by_director: 'border-[#BFE8CC] bg-[#EAF8EF] text-[#237A3A] dark:border-[#2F7A47] dark:bg-[#123A26] dark:text-[#BBF7D0]',
  clarification_from_director: 'border-[#F8DCA6] bg-[#FFF7E6] text-[#A26000] dark:border-[#926C25] dark:bg-[#3D2A11] dark:text-[#FDE68A]',
  clarification_director: 'border-[#F8DCA6] bg-[#FFF7E6] text-[#A26000] dark:border-[#926C25] dark:bg-[#3D2A11] dark:text-[#FDE68A]',
  approved_by_director: 'border-[#BFE8CC] bg-[#EAF8EF] text-[#237A3A] dark:border-[#2F7A47] dark:bg-[#123A26] dark:text-[#BBF7D0]',
  director_approved: 'border-[#BFE8CC] bg-[#EAF8EF] text-[#237A3A] dark:border-[#2F7A47] dark:bg-[#123A26] dark:text-[#BBF7D0]',
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
  return <span className={`status-pill ${tone[value] ?? 'border-border bg-surface-raised text-muted'}`}>{label}</span>
}
