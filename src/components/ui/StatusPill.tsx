import type { CycleStatus, Role, SubmissionStatus } from '../../domain/types'
import { roleLabel } from '../../store/appStore'
import { useState } from 'react'

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

const descriptions: Record<string, string> = {
  active: 'This KPI is assigned to the focal point and is waiting for KPI entry.',
  draft: 'The focal point has completed the KPI as a draft. It can be included in bulk submission to Performance Team.',
  submitted: 'This KPI has been submitted and is waiting for the next workflow owner.',
  submitted_to_performance_team: 'This KPI is with the Performance Team for validation and review.',
  reviewed_by_performance_team: 'Performance Team has reviewed this KPI. It can move forward at focal point submission level.',
  with_performance_team: 'This KPI is with the Performance Team for validation and review.',
  clarification_from_performance: 'Performance Team returned this KPI to the focal point for clarification.',
  clarification_focal: 'Performance Team returned this KPI to the focal point for clarification.',
  submitted_to_director: 'This KPI has been submitted to the Department Director for review.',
  reviewed_by_director: 'Department Director has reviewed this KPI. The focal point submission can be approved when all KPIs are reviewed.',
  clarification_from_director: 'Department Director returned this KPI for clarification through the workflow.',
  clarification_director: 'Department Director returned this KPI for clarification through the workflow.',
  approved_by_director: 'Department Director approved the focal point submission. It is ready for Performance Team publishing.',
  director_approved: 'Department Director approved the focal point submission. It is ready for Performance Team publishing.',
  published: 'This KPI has been published and is visible in executive reporting.',
  closed: 'This cycle or status is closed and no longer accepts workflow movement.',
}

interface StatusPillProps {
  value: Role | CycleStatus | SubmissionStatus
}

export function StatusPill({ value }: StatusPillProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null)
  const label = labels[value] ?? (value.includes('_') ? roleLabel(value as Role) : value[0].toUpperCase() + value.slice(1))
  const description = descriptions[value] ?? `${label} is the current workflow status.`
  const updateTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const tooltipWidth = 280
    const margin = 12
    const left = Math.min(window.innerWidth - tooltipWidth / 2 - margin, Math.max(tooltipWidth / 2 + margin, rect.left + rect.width / 2))
    const top = Math.max(12, rect.top - 12)
    setTooltipPosition({ top, left })
  }
  return (
    <span
      className="inline-flex"
      onMouseEnter={(event) => {
        updateTooltipPosition(event.currentTarget)
      }}
      onMouseLeave={() => setTooltipPosition(null)}
      onFocus={(event) => {
        updateTooltipPosition(event.currentTarget)
      }}
      onBlur={() => setTooltipPosition(null)}
      tabIndex={0}
    >
      <span className={`status-pill ${tone[value] ?? 'border-border bg-surface-raised text-muted'}`}>{label}</span>
      {tooltipPosition ? (
        <span
          className="pointer-events-none fixed z-[999] w-[280px] -translate-x-1/2 -translate-y-full rounded-2xl border border-border bg-surface px-3 py-2 text-left text-xs font-semibold leading-5 text-muted opacity-100 shadow-card transition"
          style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        >
          <span className="block text-sm font-extrabold text-text">{label}</span>
          <span className="mt-1 block">{description}</span>
        </span>
      ) : null}
    </span>
  )
}
