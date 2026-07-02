import { History } from 'lucide-react'
import { StatusPill } from '../components/ui/StatusPill'
import { mockApi } from '../mockApi/mockApi'
import { roleLabel, useAppStore } from '../store/appStore'

export function ActivityLogPage() {
  const { activeCycleId } = useAppStore()
  const currentUser = mockApi.getCurrentUser()
  const users = mockApi.getUsers()
  const events = mockApi
    .getVisibleSubmissionsForRole(currentUser.role, currentUser.id, activeCycleId)
    .flatMap((submission) => submission.history.map((event) => ({ ...event, submission })))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  return (
    <div className="space-y-5">
      <section className="raised-card p-6">
        <p className="eyebrow">Audit Log</p>
        <h2 className="mt-1 text-3xl">KPI status history</h2>
        <p className="mt-2 text-sm text-muted">Every status change records actor, role, timestamp, and note.</p>
      </section>
      <section className="card overflow-hidden">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase text-muted">
            <tr><th className="px-4 py-3">Event</th><th>Actor</th><th>Role</th><th>Transition</th><th>Timestamp</th></tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const actor = users.find((user) => user.id === event.actorId)
              return (
                <tr className="border-t border-border hover:bg-primary-tint" key={event.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-primary" /><span>{event.note ?? 'Status changed'}</span></div></td>
                  <td>{actor?.name ?? event.actorId}</td>
                  <td>{roleLabel(event.actorRole)}</td>
                  <td><div className="flex gap-2"><StatusPill value={event.fromStatus} /><StatusPill value={event.toStatus} /></div></td>
                  <td className="font-mono text-xs">{new Date(event.timestamp).toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
