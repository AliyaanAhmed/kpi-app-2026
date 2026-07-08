import type { AppData, Kpi, KpiSubmission, SubmissionStatus } from '../domain/types'

const sectors = [
  { id: 'sec-digital', name: 'Digital Government', executiveDirectorId: 'u-ed-digital' },
  { id: 'sec-operations', name: 'Government Operations', executiveDirectorId: 'u-ed-operations' },
  { id: 'sec-citizen', name: 'Citizen Services', executiveDirectorId: 'u-ed-citizen' },
]

const departments = [
  { id: 'dep-data', name: 'Data Governance', sectorId: 'sec-digital', directorId: 'u-dir-data' },
  { id: 'dep-cloud', name: 'Cloud Operations', sectorId: 'sec-digital', directorId: 'u-dir-cloud' },
  { id: 'dep-cyber', name: 'Cyber Security', sectorId: 'sec-digital', directorId: 'u-dir-cyber' },
  { id: 'dep-finance', name: 'Financial Performance', sectorId: 'sec-operations', directorId: 'u-dir-finance' },
  { id: 'dep-enterprise', name: 'Enterprise Architecture', sectorId: 'sec-operations', directorId: 'u-dir-enterprise' },
  { id: 'dep-procurement', name: 'Strategic Procurement', sectorId: 'sec-operations', directorId: 'u-dir-procurement' },
  { id: 'dep-experience', name: 'Digital Experience', sectorId: 'sec-citizen', directorId: 'u-dir-experience' },
  { id: 'dep-support', name: 'Citizen Support', sectorId: 'sec-citizen', directorId: 'u-dir-support' },
  { id: 'dep-learning', name: 'Learning & Growth', sectorId: 'sec-citizen', directorId: 'u-dir-learning' },
]

const users = [
  { id: 'u-admin', name: 'Mariam Al Nuaimi', email: 'admin@govdigital.local', role: 'admin', active: true },
  { id: 'u-pa-1', name: 'Hussain Mohammed', email: 'hussain.mohammed@govdigital.local', role: 'performance_team', active: true },
  { id: 'u-ed-digital', name: 'Digital Government Executive Director', email: 'executive@govdigital.local', role: 'executive_director', sectorId: 'sec-digital', active: true },
  { id: 'u-ed-operations', name: 'Government Operations Executive Director', email: 'operations.executive@govdigital.local', role: 'executive_director', sectorId: 'sec-operations', active: true },
  { id: 'u-ed-citizen', name: 'Citizen Services Executive Director', email: 'citizen.executive@govdigital.local', role: 'executive_director', sectorId: 'sec-citizen', active: true },
  { id: 'u-dg-1', name: 'H.E. Director General', email: 'director.general@govdigital.local', role: 'director_general', active: true },
  { id: 'u-dir-data', name: 'Data Governance Director', email: 'data.director@govdigital.local', role: 'department_director', departmentId: 'dep-data', sectorId: 'sec-digital', active: true },
  { id: 'u-dir-cloud', name: 'Cloud Operations Director', email: 'cloud.director@govdigital.local', role: 'department_director', departmentId: 'dep-cloud', sectorId: 'sec-digital', active: true },
  { id: 'u-dir-cyber', name: 'Cyber Security Director', email: 'cyber.director@govdigital.local', role: 'department_director', departmentId: 'dep-cyber', sectorId: 'sec-digital', active: true },
  { id: 'u-dir-finance', name: 'Financial Performance Director', email: 'finance.director@govdigital.local', role: 'department_director', departmentId: 'dep-finance', sectorId: 'sec-operations', active: true },
  { id: 'u-dir-enterprise', name: 'Enterprise Architecture Director', email: 'enterprise.director@govdigital.local', role: 'department_director', departmentId: 'dep-enterprise', sectorId: 'sec-operations', active: true },
  { id: 'u-dir-procurement', name: 'Strategic Procurement Director', email: 'procurement.director@govdigital.local', role: 'department_director', departmentId: 'dep-procurement', sectorId: 'sec-operations', active: true },
  { id: 'u-dir-experience', name: 'Digital Experience Director', email: 'experience.director@govdigital.local', role: 'department_director', departmentId: 'dep-experience', sectorId: 'sec-citizen', active: true },
  { id: 'u-dir-support', name: 'Citizen Support Director', email: 'support.director@govdigital.local', role: 'department_director', departmentId: 'dep-support', sectorId: 'sec-citizen', active: true },
  { id: 'u-dir-learning', name: 'Learning & Growth Director', email: 'learning.director@govdigital.local', role: 'department_director', departmentId: 'dep-learning', sectorId: 'sec-citizen', active: true },
  { id: 'u-fp-data', name: 'Gaith - Focal Point 1', email: 'data.focal@govdigital.local', role: 'focal_point', departmentId: 'dep-data', departmentIds: ['dep-data', 'dep-cyber', 'dep-enterprise'], sectorId: 'sec-digital', active: true },
  { id: 'u-fp-cloud', name: 'Ihab - Focal Point 2', email: 'cloud.focal@govdigital.local', role: 'focal_point', departmentId: 'dep-cloud', departmentIds: ['dep-cloud', 'dep-finance', 'dep-experience'], sectorId: 'sec-digital', active: true },
  { id: 'u-fp-shared', name: 'Ali Solomoni - Focal Point 3', email: 'shared.focal@govdigital.local', role: 'focal_point', departmentId: 'dep-data', departmentIds: ['dep-data', 'dep-cloud', 'dep-procurement', 'dep-support', 'dep-learning'], sectorId: 'sec-digital', active: true },
  { id: 'u-fp-demo', name: 'Noura Al Mansoori - Focal Point 4', email: 'noura.focal@govdigital.local', role: 'focal_point', departmentId: 'dep-data', departmentIds: ['dep-data'], sectorId: 'sec-digital', active: true },
] satisfies AppData['users']

const teams = departments.map((department, index) => ({
  id: `team-${department.id}`,
  departmentId: department.id,
  focalPointIds: department.id === 'dep-data'
    ? ['u-fp-data', 'u-fp-shared']
    : index % 3 === 1 ? ['u-fp-cloud', 'u-fp-shared'] : ['u-fp-shared', 'u-fp-data'],
}))

const categories = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth', 'Digital Excellence']

const defaultKpiQuestions = [
  { id: 'analysis', label: 'Analysis' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'recommendations', label: 'Recommendations' },
]

const baseKpis: Kpi[] = departments.flatMap((department, departmentIndex) =>
  Array.from({ length: 4 }, (_, localIndex) => {
    const index = departmentIndex * 4 + localIndex
    const category = categories[index % categories.length]

    return {
      id: `kpi-${String(index + 1).padStart(3, '0')}`,
      name: `${department.name} ${category} KPI ${localIndex + 1}`,
      description: `Measures ${category.toLowerCase()} progress for ${department.name}.`,
      category,
      departmentId: department.id,
      targetType: index % 3 === 0 ? 'percentage' : index % 3 === 1 ? 'number' : 'boolean',
      questions: defaultKpiQuestions.map((question) => ({ ...question })),
    }
  }))

const demoSubmissionKpis: Kpi[] = ['Financial', 'Customer', 'Internal Process', 'Digital Excellence'].map((category, index) => ({
  id: `kpi-${String(37 + index).padStart(3, '0')}`,
  name: `Data Governance Client Demo ${category} KPI`,
  description: `Demo KPI for client walkthrough of the Data Governance submission workflow.`,
  category,
  departmentId: 'dep-data',
  targetType: 'percentage',
  questions: defaultKpiQuestions.map((question) => ({ ...question })),
}))

const kpis: Kpi[] = [...baseKpis, ...demoSubmissionKpis]

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

const statusMix: SubmissionStatus[] = [
  'published',
  'approved_by_director',
  'reviewed_by_director',
  'submitted_to_director',
  'reviewed_by_performance_team',
  'submitted_to_performance_team',
  'draft',
  'clarification_from_performance',
  'clarification_from_director',
  'active',
]

const actualScoreMix = [
  118,
  104,
  96,
  91,
  86,
  82,
  76,
  69,
  58,
  undefined,
  112,
  88,
  73,
  64,
  undefined,
  101,
  93,
  79,
]

const demoAssignments: { kpiId: string; focalPointId: string; status: SubmissionStatus; actualScore?: number }[] = baseKpis.map((kpi, index) => {
  const team = teams.find((item) => item.departmentId === kpi.departmentId)!
  return {
    kpiId: kpi.id,
    focalPointId: team.focalPointIds[index % team.focalPointIds.length],
    status: statusMix[index % statusMix.length],
    actualScore: actualScoreMix[index % actualScoreMix.length],
  }
})

const submissions: KpiSubmission[] = demoAssignments.map(({ kpiId, focalPointId, status, actualScore }, index) => {
  const kpi = kpis.find((item) => item.id === kpiId)!
  const team = teams.find((item) => item.departmentId === kpi.departmentId)!
  const cycle = cycles.find((item) => item.id === 'cycle-q2-2026')!
  const isEntered = status !== 'active' && actualScore !== undefined
  const isPerformanceReviewed = ['reviewed_by_performance_team', 'submitted_to_director', 'reviewed_by_director', 'approved_by_director', 'published'].includes(status)
  const isDirectorReviewed = ['reviewed_by_director', 'approved_by_director', 'published'].includes(status)
  return {
    id: `sub-cycle-q2-2026-${kpiId}`,
    kpiId,
    cycleId: 'cycle-q2-2026',
    focalPointId,
    teamId: team.id,
    targetScore: cycle.targetScore,
    actualScore: isEntered ? actualScore : undefined,
    answers: kpi.questions.map((question) => ({
      questionId: question.id,
      answer: isEntered ? `${question.label} narrative for ${kpi.name} with measurable evidence and department context.` : '',
    })),
    attachments: isEntered && index % 5 !== 0 ? [{ id: `att-${kpiId}`, fileName: `${kpi.name}.pdf`, url: '#' }] : [],
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

const demoReadySubmissions: KpiSubmission[] = demoSubmissionKpis.map((kpi, index) => {
  const cycle = cycles.find((item) => item.id === 'cycle-q2-2026')!
  const actualScore = [94, 91, 88, 96][index]
  return {
    id: `sub-cycle-q2-2026-${kpi.id}`,
    kpiId: kpi.id,
    cycleId: 'cycle-q2-2026',
    focalPointId: 'u-fp-demo',
    teamId: 'team-dep-data',
    targetScore: cycle.targetScore,
    actualScore,
    answers: kpi.questions.map((question) => ({
      questionId: question.id,
      answer: `${question.label} narrative for ${kpi.name}. The KPI is ready for Performance Team validation with measurable actuals, evidence alignment, and clear governance context.`,
    })),
    attachments: [{ id: `att-${kpi.id}`, fileName: `${kpi.name}.pdf`, url: '#' }],
    status: 'draft',
    history: [
      {
        id: `hist-${kpi.id}-demo-draft`,
        actorId: 'u-fp-demo',
        actorRole: 'focal_point',
        fromStatus: 'active',
        toStatus: 'draft',
        note: 'Demo KPI response completed and saved as draft for bulk submission.',
        timestamp: `2026-06-${String(21 + index).padStart(2, '0')}T10:15:00.000Z`,
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
  submissions: [...submissions, ...demoReadySubmissions],
  changeRequests: [],
}
