import type { AppData, Kpi, KpiSubmission, SubmissionStatus } from '../domain/types'

const sectors = [
  { id: 'sec-digital', name: 'Digital Government', executiveDirectorId: 'u-ed-digital' },
]

const departments = [
  { id: 'dep-data', name: 'Data Governance', sectorId: 'sec-digital', directorId: 'u-dir-data' },
  { id: 'dep-cloud', name: 'Cloud Operations', sectorId: 'sec-digital', directorId: 'u-dir-cloud' },
]

const users = [
  { id: 'u-admin', name: 'Mariam Al Nuaimi', email: 'admin@govdigital.local', role: 'admin', active: true },
  { id: 'u-pa-1', name: 'Ali Raza', email: 'ali@govdigital.local', role: 'performance_team', active: true },
  { id: 'u-dir-data', name: 'Data Governance Director', email: 'data.director@govdigital.local', role: 'department_director', departmentId: 'dep-data', sectorId: 'sec-digital', active: true },
  { id: 'u-dir-cloud', name: 'Cloud Operations Director', email: 'cloud.director@govdigital.local', role: 'department_director', departmentId: 'dep-cloud', sectorId: 'sec-digital', active: true },
  { id: 'u-fp-data', name: 'Data Governance Focal Point', email: 'data.focal@govdigital.local', role: 'focal_point', departmentId: 'dep-data', departmentIds: ['dep-data'], sectorId: 'sec-digital', active: true },
  { id: 'u-fp-cloud', name: 'Cloud Operations Focal Point', email: 'cloud.focal@govdigital.local', role: 'focal_point', departmentId: 'dep-cloud', departmentIds: ['dep-cloud'], sectorId: 'sec-digital', active: true },
  { id: 'u-fp-shared', name: 'Shared Services Focal Point', email: 'shared.focal@govdigital.local', role: 'focal_point', departmentId: 'dep-data', departmentIds: ['dep-data', 'dep-cloud'], sectorId: 'sec-digital', active: true },
] satisfies AppData['users']

const teams = [
  { id: 'team-dep-data', departmentId: 'dep-data', focalPointIds: ['u-fp-data', 'u-fp-shared'] },
  { id: 'team-dep-cloud', departmentId: 'dep-cloud', focalPointIds: ['u-fp-cloud', 'u-fp-shared'] },
]

const categories = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth', 'Digital Excellence']

const defaultKpiQuestions = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'recommendations', label: 'Recommendations' },
]

const kpis: Kpi[] = Array.from({ length: 9 }, (_, index) => {
  const department = departments[index % departments.length]
  const category = categories[index % categories.length]

  return {
    id: `kpi-${String(index + 1).padStart(3, '0')}`,
    name: `${category} KPI ${index + 1}`,
    description: `Measures ${category.toLowerCase()} progress for ${department.name}.`,
    category,
    departmentId: department.id,
    targetType: index % 3 === 0 ? 'percentage' : index % 3 === 1 ? 'number' : 'boolean',
    questions: defaultKpiQuestions.map((question) => ({ ...question })),
  }
})

const templates = [
  {
    id: 'tpl-balanced-scorecard',
    name: 'Government Balanced Scorecard',
    description: 'Primary quarterly template covering enterprise performance categories.',
    kpiIds: kpis.map((kpi) => kpi.id),
  },
  {
    id: 'tpl-digital-acceleration',
    name: 'Digital Acceleration Template',
    description: 'ICT and transformation-heavy KPI template for digital delivery cycles.',
    kpiIds: kpis.slice(0, 6).map((kpi) => kpi.id),
  },
]

const cycles = [
  {
    id: 'cycle-q2-2026',
    label: 'Q2 2026',
    type: 'quarterly',
    templateId: 'tpl-balanced-scorecard',
    status: 'published',
    targetScore: 90,
    startDate: '2026-04-01',
    endDate: '2026-06-30',
  },
  {
    id: 'cycle-fy-2027',
    label: 'FY 2027 Planning',
    type: 'yearly',
    templateId: 'tpl-digital-acceleration',
    status: 'draft',
    targetScore: 85,
    startDate: '2027-01-01',
    endDate: '2027-12-31',
  },
] satisfies AppData['cycles']

const demoAssignments: { kpiId: string; focalPointId: string; status: SubmissionStatus }[] = [
  { kpiId: 'kpi-001', focalPointId: 'u-fp-data', status: 'draft' },
  { kpiId: 'kpi-003', focalPointId: 'u-fp-data', status: 'draft' },
  { kpiId: 'kpi-005', focalPointId: 'u-fp-data', status: 'draft' },
  { kpiId: 'kpi-002', focalPointId: 'u-fp-cloud', status: 'submitted_to_performance_team' },
  { kpiId: 'kpi-004', focalPointId: 'u-fp-cloud', status: 'submitted_to_performance_team' },
  { kpiId: 'kpi-006', focalPointId: 'u-fp-cloud', status: 'submitted_to_performance_team' },
  { kpiId: 'kpi-007', focalPointId: 'u-fp-shared', status: 'submitted_to_director' },
  { kpiId: 'kpi-008', focalPointId: 'u-fp-shared', status: 'submitted_to_director' },
  { kpiId: 'kpi-009', focalPointId: 'u-fp-shared', status: 'submitted_to_director' },
]

const submissions: KpiSubmission[] = demoAssignments.map(({ kpiId, focalPointId, status }, index) => {
  const kpi = kpis.find((item) => item.id === kpiId)!
  const team = teams.find((item) => item.departmentId === kpi.departmentId)!
  const cycle = cycles.find((item) => item.id === 'cycle-q2-2026')!
  const isEntered = status !== 'active'
  const isPerformanceReviewed = ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'published'].includes(status)
  const isDirectorReviewed = ['reviewed_by_director', 'approved_by_director', 'published'].includes(status)
  return {
    id: `sub-cycle-q2-2026-${kpiId}`,
    kpiId,
    cycleId: 'cycle-q2-2026',
    focalPointId,
    teamId: team.id,
    targetScore: cycle.targetScore,
    actualScore: isEntered ? 74 + ((index * 4) % 22) : undefined,
    answers: kpi.questions.map((question) => ({
      questionId: question.id,
      answer: isEntered ? `${question.label} narrative for ${kpi.name} with measurable evidence and department context.` : '',
    })),
    attachments: isEntered ? [{ id: `att-${kpiId}`, fileName: `${kpi.name}.pdf`, url: '#' }] : [],
    performanceTeamComment: isPerformanceReviewed
      ? `Performance Team reviewed ${kpi.name} and confirmed evidence readiness for director handoff.`
      : status === 'clarification_from_performance'
        ? `Performance Team requested stronger evidence and clearer analysis for ${kpi.name}.`
        : undefined,
    directorComment: isDirectorReviewed
      ? `Director reviewed ${kpi.name} and confirmed department-level acceptance.`
      : status === 'clarification_from_director'
        ? `Director requested focal point clarification on ${kpi.name} before approval.`
        : undefined,
    status,
    history: [
      {
        id: `hist-${kpiId}-1`,
        actorId: focalPointId,
        actorRole: 'focal_point',
        fromStatus: 'active',
        toStatus: status,
        note: status === 'draft'
            ? 'Draft saved for the active cycle.'
            : `Seeded workflow state: ${status.replaceAll('_', ' ')}.`,
        timestamp: `2026-06-${String(10 + (index % 15)).padStart(2, '0')}T09:30:00.000Z`,
      },
    ],
  }
})

export const seedData: AppData = {
  sectors,
  departments,
  teams,
  users,
  kpis,
  templates,
  cycles,
  submissions,
  changeRequests: [],
}
