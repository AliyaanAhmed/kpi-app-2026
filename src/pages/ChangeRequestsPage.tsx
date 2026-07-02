import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, FilePenLine, LockKeyhole, Send, SlidersHorizontal, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppSelect } from '../components/ui/AppSelect'
import type { ChangeRequest, ChangeRequestStatus, ChangeRequestType } from '../domain/types'
import { mockApi } from '../mockApi/mockApi'
import { useAppStore } from '../store/appStore'
import { useToast } from '../context/ToastContext'
import { cn } from '../lib/cn'

const requestTypeOptions: { value: ChangeRequestType; label: string }[] = [
  { value: 'target_score', label: 'Target Score' },
  { value: 'definition', label: 'KPI Definition' },
  { value: 'kpi_details', label: 'KPI Details' },
]

const statusTone: Record<ChangeRequestStatus, string> = {
  pending: 'border-warning/25 bg-warning/10 text-warning',
  approved: 'border-success/25 bg-success/10 text-success',
  rejected: 'border-danger/25 bg-danger/10 text-danger',
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function ChangeRequestPill({ status }: { status: ChangeRequestStatus }) {
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-bold', statusTone[status])}>
      {titleCase(status)}
    </span>
  )
}

function currentValueFor(type: ChangeRequestType, kpiId: string, cycleId: string) {
  const kpi = mockApi.getKpi(kpiId)
  const submission = mockApi.getSubmissionForKpi(kpiId, cycleId)
  if (!kpi) return ''
  if (type === 'target_score') return String(submission?.targetScore ?? mockApi.getActiveCycle()?.targetScore ?? '')
  if (type === 'definition') return kpi.description
  return kpi.name
}

function requestMeta(request: ChangeRequest) {
  const kpi = mockApi.getKpi(request.kpiId)
  const department = mockApi.getDepartment(request.departmentId)
  const cycle = mockApi.getCycles().find((item) => item.id === request.cycleId)
  const user = mockApi.getUsers().find((item) => item.id === request.focalPointId)
  return { kpi, department, cycle, user }
}

function FocalPointChangeRequests() {
  const { activeCycleId } = useAppStore()
  const user = mockApi.getCurrentUser()
  const { showSuccessToast, showErrorToast } = useToast()
  const cycle = mockApi.getActiveCycle()
  const eligible = cycle ? mockApi.isChangeRequestCycleEligible(cycle) : false
  const roleKpis = mockApi.getKpisForRole('focal_point', user.id, activeCycleId)
  const activeSubmissions = mockApi
    .getVisibleSubmissionsForRole('focal_point', user.id, activeCycleId)
    .filter((submission) => !['published', 'director_approved', 'submitted_to_director', 'with_performance_team'].includes(submission.status))
  const allowedKpiIds = new Set(activeSubmissions.map((submission) => submission.kpiId))
  const kpis = roleKpis.filter((kpi) => allowedKpiIds.has(kpi.id))
  const [kpiId, setKpiId] = useState(kpis[0]?.id ?? '')
  const [type, setType] = useState<ChangeRequestType>('target_score')
  const [proposedValue, setProposedValue] = useState('')
  const [reason, setReason] = useState('')
  const myRequests = mockApi
    .getChangeRequests()
    .filter((request) => request.focalPointId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const selectedKpi = mockApi.getKpi(kpiId)
  const selectedDepartment = selectedKpi ? mockApi.getDepartment(selectedKpi.departmentId) : undefined
  const currentValue = currentValueFor(type, kpiId, activeCycleId)

  useEffect(() => {
    setKpiId((current) => current || kpis[0]?.id || '')
  }, [kpis])

  useEffect(() => {
    setProposedValue(type === 'target_score' ? currentValue : '')
  }, [currentValue, type])

  function submitRequest() {
    if (!eligible) {
      showErrorToast('CR locked', 'Change Requests can only be raised during Q1 and Q2.')
      return
    }
    if (!selectedKpi || !selectedDepartment || !proposedValue.trim() || !reason.trim()) {
      showErrorToast('Missing details', 'Select a KPI, proposed change, and business reason.')
      return
    }
    const created = mockApi.createChangeRequest({
      kpiId: selectedKpi.id,
      cycleId: activeCycleId,
      focalPointId: user.id,
      departmentId: selectedDepartment.id,
      type,
      proposedValue: proposedValue.trim(),
      reason: reason.trim(),
    })
    if (!created) {
      showErrorToast('CR not allowed', 'This cycle is outside the Q1/Q2 change request window.')
      return
    }
    setReason('')
    setProposedValue(type === 'target_score' ? currentValue : '')
    showSuccessToast('Change request submitted', 'Admin can now review, approve, or reject the KPI change request.')
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="raised-card p-6">
          <p className="eyebrow">Focal Point Workspace</p>
          <h2 className="mt-2 text-3xl">Raise Change Request</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Request changes to KPI details, definitions, or target scores. CRs are routed to Admin and are only available during Q1 and Q2.
          </p>
        </div>
        <motion.article
          className={cn(
            'rounded-[28px] border p-5',
            eligible ? 'border-success/25 bg-success/10' : 'border-warning/25 bg-warning/10',
          )}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-start gap-3">
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white', eligible ? 'bg-success' : 'bg-warning')}>
              {eligible ? <CheckCircle2 className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold">{eligible ? 'CR Window Open' : 'CR Window Locked'}</h3>
              <p className="mt-1 text-sm font-semibold text-muted">{cycle?.label ?? 'Selected cycle'}</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {eligible ? 'This cycle is eligible for KPI change requests.' : 'Change Requests are restricted after Q2 to protect year-end reporting.'}
              </p>
            </div>
          </div>
        </motion.article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="card p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-tint text-primary">
              <FilePenLine className="h-5 w-5" />
            </div>
            <div className="flex min-h-11 items-center">
              <h3 className="text-xl font-extrabold">KPI change details</h3>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">KPI</label>
              <AppSelect
                value={kpiId}
                onValueChange={setKpiId}
                disabled={!eligible || !kpis.length}
                options={kpis.map((kpi) => ({ value: kpi.id, label: kpi.name }))}
                placeholder="Select assigned KPI"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Request Type</label>
              <AppSelect
                value={type}
                onValueChange={(value) => setType(value as ChangeRequestType)}
                disabled={!eligible}
                options={requestTypeOptions}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Current Value</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{currentValue || 'Select a KPI to view the current value.'}</p>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Proposed Value</label>
            {type === 'target_score' ? (
              <input
                className="field w-full"
                disabled={!eligible}
                min={0}
                max={100}
                type="number"
                value={proposedValue}
                onChange={(event) => setProposedValue(event.target.value)}
              />
            ) : (
              <textarea
                className="min-h-28 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!eligible}
                placeholder={type === 'definition' ? 'Write the revised KPI definition...' : 'Write the revised KPI name/details...'}
                value={proposedValue}
                onChange={(event) => setProposedValue(event.target.value)}
              />
            )}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Business Reason</label>
            <textarea
              className="min-h-28 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!eligible}
              placeholder="Explain why this KPI needs to change during the active cycle..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={!eligible || !kpis.length} onClick={submitRequest} type="button">
              Submit CR <Send className="h-4 w-4" />
            </button>
          </div>
        </article>

        <article className="card p-5">
          <h3 className="text-xl font-extrabold">Request history</h3>
          <div className="mt-4 space-y-3">
            {myRequests.map((request) => {
              const { kpi, cycle } = requestMeta(request)
              return (
                <div className="rounded-2xl border border-border bg-surface-raised p-4" key={request.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{kpi?.name}</p>
                      <p className="mt-1 text-xs text-muted">{cycle?.label} / {titleCase(request.type)}</p>
                    </div>
                    <ChangeRequestPill status={request.status} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted">{request.reason}</p>
                  {request.adminNote ? <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs font-semibold text-muted">{request.adminNote}</p> : null}
                </div>
              )
            })}
            {!myRequests.length ? (
              <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">
                No change requests have been raised yet.
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  )
}

function AdminChangeRequests() {
  const { showSuccessToast } = useToast()
  const [statusFilter, setStatusFilter] = useState<'all' | ChangeRequestStatus>('pending')
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [proposedValues, setProposedValues] = useState<Record<string, string>>({})
  const requests = mockApi
    .getChangeRequests()
    .filter((request) => statusFilter === 'all' || request.status === statusFilter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function decide(request: ChangeRequest, decision: 'approved' | 'rejected') {
    const updated = mockApi.decideChangeRequest(
      request.id,
      decision,
      adminNotes[request.id],
      proposedValues[request.id] ?? request.proposedValue,
    )
    if (updated) {
      showSuccessToast(
        decision === 'approved' ? 'Change request approved' : 'Change request rejected',
        decision === 'approved' ? 'The approved KPI change has been applied to mock data.' : 'The focal point can view the rejection note.',
      )
    }
  }

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Admin Workspace</p>
            <h2 className="mt-2 text-3xl">Change Request Management</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Review CRs raised by focal points for KPI definitions, details, and target-score adjustments during Q1 and Q2.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['pending', 'approved', 'rejected'] as ChangeRequestStatus[]).map((status) => (
              <div className="card px-4 py-3 text-center" key={status}>
                <p className="font-display text-3xl font-extrabold">{mockApi.getChangeRequests().filter((request) => request.status === status).length}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{titleCase(status)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(['pending', 'all', 'approved', 'rejected'] as const).map((status) => (
          <button
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition',
              statusFilter === status ? 'bg-primary text-white' : 'border border-border bg-surface-raised hover:bg-primary-tint hover:text-primary',
            )}
            key={status}
            onClick={() => setStatusFilter(status)}
            type="button"
          >
            {titleCase(status)}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        {requests.map((request, index) => {
          const { kpi, department, cycle, user } = requestMeta(request)
          return (
            <motion.article
              className="card overflow-hidden"
              key={request.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className="border-b border-border bg-surface-raised p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                      <SlidersHorizontal className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="eyebrow">{titleCase(request.type)}</p>
                      <h3 className="mt-1 truncate text-xl font-bold">{kpi?.name}</h3>
                      <p className="mt-1 text-sm text-muted">{department?.name} / {cycle?.label} / {user?.name}</p>
                    </div>
                  </div>
                  <ChangeRequestPill status={request.status} />
                </div>
              </div>

              <div className="grid gap-4 p-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface-raised p-4">
                  <p className="eyebrow">Current Value</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{request.currentValue}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface-raised p-4">
                  <p className="eyebrow">Admin Proposed Value</p>
                  {request.status === 'pending' ? (
                    request.type === 'target_score' ? (
                      <input
                        className="field mt-2 w-full"
                        type="number"
                        value={proposedValues[request.id] ?? request.proposedValue}
                        onChange={(event) => setProposedValues((current) => ({ ...current, [request.id]: event.target.value }))}
                      />
                    ) : (
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary"
                        value={proposedValues[request.id] ?? request.proposedValue}
                        onChange={(event) => setProposedValues((current) => ({ ...current, [request.id]: event.target.value }))}
                      />
                    )
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{request.proposedValue}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-border p-5">
                <div className="rounded-2xl border border-border bg-surface-raised p-4">
                  <p className="eyebrow">Focal Point Reason</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{request.reason}</p>
                </div>

                {request.status === 'pending' ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Admin Note</label>
                      <input
                        className="field w-full"
                        placeholder="Optional approval or rejection note..."
                        value={adminNotes[request.id] ?? ''}
                        onChange={(event) => setAdminNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary border-danger/25 text-danger hover:bg-danger/10" onClick={() => decide(request, 'rejected')} type="button">
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                      <button className="btn-primary" onClick={() => decide(request, 'approved')} type="button">
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-raised p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-muted" />
                    <div>
                      <p className="text-sm font-bold">Decision Note</p>
                      <p className="mt-1 text-sm text-muted">{request.adminNote || 'No decision note provided.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.article>
          )
        })}
        {!requests.length ? (
          <div className="card p-10 text-center">
            <p className="font-semibold">No change requests found.</p>
            <p className="mt-2 text-sm text-muted">Focal point requests will appear here after submission.</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export function ChangeRequestsPage() {
  useAppStore()
  const user = mockApi.getCurrentUser()
  if (user.role === 'admin') return <AdminChangeRequests />
  return <FocalPointChangeRequests />
}
