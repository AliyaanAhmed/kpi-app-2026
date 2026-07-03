export type Role =
  | 'admin'
  | 'focal_point'
  | 'performance_team'
  | 'department_director'
  | 'executive_director'
  | 'director_general'

export type CycleStatus = 'draft' | 'published' | 'closed'
export type CycleType = 'quarterly' | 'yearly'
export type TargetType = 'number' | 'percentage' | 'boolean'
export type SubmissionStatus =
  | 'active'
  | 'draft'
  | 'submitted_to_performance_team'
  | 'reviewed_by_performance_team'
  | 'submitted_to_director'
  | 'reviewed_by_director'
  | 'clarification_from_performance'
  | 'clarification_from_director'
  | 'approved_by_director'
  | 'published'
  // Legacy aliases kept while older screens are migrated to the canonical workflow names above.
  | 'submitted'
  | 'with_performance_team'
  | 'clarification_focal'
  | 'clarification_director'
  | 'director_approved'

export type ChangeRequestType = 'kpi_details' | 'definition' | 'target_score'
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected'

export interface Sector {
  id: string
  name: string
  executiveDirectorId: string
}

export interface Department {
  id: string
  name: string
  sectorId: string
  directorId: string
}

export interface Team {
  id: string
  departmentId: string
  focalPointIds: string[]
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  departmentId?: string
  departmentIds?: string[]
  sectorId?: string
  avatarUrl?: string
  active: boolean
}

export interface KpiQuestion {
  id: string
  label: string
}

export interface Kpi {
  id: string
  name: string
  description: string
  category: string
  departmentId: string
  targetType: TargetType
  questions: KpiQuestion[]
}

export interface KpiTemplate {
  id: string
  name: string
  description: string
  kpiIds: string[]
}

export interface Cycle {
  id: string
  label: string
  type: CycleType
  templateId: string
  status: CycleStatus
  targetScore: number
  startDate: string
  endDate: string
}

export interface Attachment {
  id: string
  fileName: string
  url: string
}

export interface KpiHistoryEvent {
  id: string
  actorId: string
  actorRole: Role
  fromStatus: SubmissionStatus
  toStatus: SubmissionStatus
  note?: string
  timestamp: string
}

export interface KpiSubmission {
  id: string
  kpiId: string
  cycleId: string
  focalPointId: string
  teamId: string
  targetScore: number
  actualScore?: number
  answers: { questionId: string; answer: string }[]
  attachments: Attachment[]
  performanceTeamComment?: string
  directorComment?: string
  status: SubmissionStatus
  history: KpiHistoryEvent[]
}

export type FocalPointInstanceStatus =
  | 'draft'
  | 'submitted_to_performance_team'
  | 'reviewed_by_performance_team'
  | 'submitted_to_director'
  | 'reviewed_by_director'
  | 'clarification'
  | 'approved_by_director'
  | 'published'

export interface FocalPointSubmissionInstance {
  id: string
  cycleId: string
  focalPointId: string
  departmentIds: string[]
  sectorIds: string[]
  status: FocalPointInstanceStatus
  submissions: KpiSubmission[]
}

export interface ChangeRequest {
  id: string
  kpiId: string
  cycleId: string
  focalPointId: string
  departmentId: string
  type: ChangeRequestType
  currentValue: string
  proposedValue: string
  reason: string
  status: ChangeRequestStatus
  adminNote?: string
  createdAt: string
  decidedAt?: string
  decidedBy?: string
}

export interface AppData {
  sectors: Sector[]
  departments: Department[]
  teams: Team[]
  users: User[]
  kpis: Kpi[]
  templates: KpiTemplate[]
  cycles: Cycle[]
  submissions: KpiSubmission[]
  changeRequests: ChangeRequest[]
}
