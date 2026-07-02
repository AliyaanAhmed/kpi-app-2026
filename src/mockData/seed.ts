import type { AppData, Kpi, KpiSubmission, SubmissionStatus } from '../domain/types'

const sectors = [
  { id: 'sec-digital', name: 'Digital Government', executiveDirectorId: 'u-ed-digital' },
  { id: 'sec-operations', name: 'Government Operations', executiveDirectorId: 'u-ed-ops' },
  { id: 'sec-citizen', name: 'Citizen Services', executiveDirectorId: 'u-ed-citizen' },
]

const departments = [
  { id: 'dep-data', name: 'Data Governance', sectorId: 'sec-digital', directorId: 'u-dir-data' },
  { id: 'dep-cloud', name: 'Cloud Operations', sectorId: 'sec-digital', directorId: 'u-dir-cloud' },
  { id: 'dep-cyber', name: 'Cyber Security', sectorId: 'sec-digital', directorId: 'u-dir-cyber' },
  { id: 'dep-service', name: 'Service Transformation', sectorId: 'sec-operations', directorId: 'u-dir-service' },
  { id: 'dep-arch', name: 'Enterprise Architecture', sectorId: 'sec-operations', directorId: 'u-dir-arch' },
  { id: 'dep-finance', name: 'Financial Performance', sectorId: 'sec-operations', directorId: 'u-dir-finance' },
  { id: 'dep-experience', name: 'Digital Experience', sectorId: 'sec-citizen', directorId: 'u-dir-exp' },
  { id: 'dep-support', name: 'Citizen Support', sectorId: 'sec-citizen', directorId: 'u-dir-support' },
  { id: 'dep-learning', name: 'Learning & Growth', sectorId: 'sec-citizen', directorId: 'u-dir-learning' },
]

const users = [
  { id: 'u-admin', name: 'Mariam Al Nuaimi', email: 'admin@govdigital.local', role: 'admin', active: true },
  { id: 'u-pa-1', name: 'Ali Raza', email: 'ali@govdigital.local', role: 'performance_team', active: true },
  { id: 'u-pa-2', name: 'Sara Khan', email: 'sara@govdigital.local', role: 'performance_team', active: true },
  { id: 'u-pa-3', name: 'Omar Saeed', email: 'omar@govdigital.local', role: 'performance_team', active: true },
  { id: 'u-dg', name: 'H.E. Director General', email: 'dg@govdigital.local', role: 'director_general', active: true },
  ...sectors.map((sector) => ({
    id: sector.executiveDirectorId,
    name: `${sector.name} Executive Director`,
    email: `${sector.id}@govdigital.local`,
    role: 'executive_director' as const,
    sectorId: sector.id,
    active: true,
  })),
  ...departments.map((department) => ({
    id: department.directorId,
    name: `${department.name} Director`,
    email: `${department.id}.director@govdigital.local`,
    role: 'department_director' as const,
    departmentId: department.id,
    sectorId: department.sectorId,
    active: true,
  })),
  ...departments.flatMap((department, index) =>
    [1, 2].map((slot) => ({
      id: `u-fp-${index + 1}-${slot}`,
      name: `${department.name} Focal ${slot}`,
      email: `${department.id}.fp${slot}@govdigital.local`,
      role: 'focal_point' as const,
      departmentId: department.id,
      sectorId: department.sectorId,
      active: true,
    })),
  ),
] satisfies AppData['users']

const teams = departments.map((department, index) => ({
  id: `team-${department.id}`,
  departmentId: department.id,
  focalPointIds: [`u-fp-${index + 1}-1`, `u-fp-${index + 1}-2`],
}))

const categories = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth', 'Digital Excellence']

const defaultKpiQuestions = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'recommendations', label: 'Recommendations' },
]

const kpis: Kpi[] = Array.from({ length: 20 }, (_, index) => {
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
    kpiIds: kpis.slice(0, 18).map((kpi) => kpi.id),
  },
  {
    id: 'tpl-digital-acceleration',
    name: 'Digital Acceleration Template',
    description: 'ICT and transformation-heavy KPI template for digital delivery cycles.',
    kpiIds: kpis.slice(2, 20).map((kpi) => kpi.id),
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

const statusCycle: SubmissionStatus[] = [
  'active',
  'draft',
  'submitted',
  'with_performance_team',
  'clarification_focal',
  'submitted_to_director',
  'clarification_director',
  'director_approved',
  'published',
]

const submissions: KpiSubmission[] = templates[0].kpiIds.map((kpiId, index) => {
  const kpi = kpis.find((item) => item.id === kpiId)!
  const team = teams.find((item) => item.departmentId === kpi.departmentId)!
  const status = statusCycle[index % statusCycle.length]
  const cycle = cycles.find((item) => item.id === 'cycle-q2-2026')!

  return {
    id: `sub-${kpiId}`,
    kpiId,
    cycleId: 'cycle-q2-2026',
    focalPointId: team.focalPointIds[index % team.focalPointIds.length],
    teamId: team.id,
    targetScore: cycle.targetScore,
    actualScore: ['active', 'draft'].includes(status) ? undefined : 62 + ((index * 7) % 35),
    answers: kpi.questions.map((question) => ({
      questionId: question.id,
      answer: ['active', 'draft'].includes(status) ? '' : `Evidence summary for ${kpi.name}.`,
    })),
    attachments: ['active', 'draft'].includes(status) ? [] : [{ id: `att-${kpiId}`, fileName: `${kpi.name}.pdf`, url: '#' }],
    status,
    history: [
      {
        id: `hist-${kpiId}-1`,
        actorId: team.focalPointIds[0],
        actorRole: 'focal_point',
        fromStatus: 'active',
        toStatus: status,
        note: status === 'active' ? 'KPI activated for the published cycle.' : status === 'draft' ? 'Draft saved for the active cycle.' : 'Submitted with supporting evidence.',
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
