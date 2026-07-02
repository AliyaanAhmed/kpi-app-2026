import { Pencil, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { StatusPill } from '../../components/ui/StatusPill'
import { AppSelect } from '../../components/ui/AppSelect'
import type { Role, User } from '../../domain/types'
import { mockApi } from '../../mockApi/mockApi'
import { useAppStore } from '../../store/appStore'

const roles: Role[] = ['admin', 'focal_point', 'performance_team', 'department_director', 'executive_director', 'director_general']
const blankUser: User = { id: '', name: '', email: '', role: 'focal_point', active: true }

export function AdminUsersPage() {
  useAppStore()
  const users = mockApi.getUsers()
  const departments = mockApi.getDepartments()
  const sectors = mockApi.getSectors()
  const [editing, setEditing] = useState<User | null>(null)

  function save() {
    if (!editing?.name || !editing.email) return
    mockApi.upsertUser({ ...editing, id: editing.id || `u-${Date.now()}` })
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">Admin Module</p><h2 className="text-2xl">User Management</h2></div>
        <button className="btn-primary" onClick={() => setEditing(blankUser)}><UserPlus className="h-4 w-4" /> Invite User</button>
      </div>
      <section className="card overflow-hidden">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase text-muted"><tr><th className="px-4 py-3">User</th><th>Role</th><th>Department</th><th>Sector</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{users.map((user) => <tr className="border-t border-border hover:bg-primary-tint" key={user.id}><td className="px-4 py-3"><p className="font-semibold">{user.name}</p><p className="text-xs text-muted">{user.email}</p></td><td><StatusPill value={user.role} /></td><td>{departments.find((department) => department.id === user.departmentId)?.name ?? '-'}</td><td>{sectors.find((sector) => sector.id === user.sectorId)?.name ?? '-'}</td><td>{user.active ? 'Active' : 'Disabled'}</td><td><button className="btn-secondary h-8 px-3 text-xs" onClick={() => setEditing(user)}><Pencil className="h-3.5 w-3.5" /> Edit</button></td></tr>)}</tbody>
        </table>
      </section>
      <Modal open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} icon={<UserPlus className="h-5 w-5" />} eyebrow="User profile" title={editing?.id ? 'Edit User' : 'Invite User'} description="Assign role and hierarchy context for local role-based routing and data visibility." footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save User</button></div>}>
        {editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <input className="field" placeholder="Name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            <input className="field" placeholder="Email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
            <AppSelect value={editing.role} onValueChange={(value) => setEditing({ ...editing, role: value as Role })} options={roles.map((role) => ({ value: role, label: role.replaceAll('_', ' ') }))} />
            <AppSelect
              value={editing.departmentId ?? 'none'}
              onValueChange={(value) => setEditing({ ...editing, departmentId: value === 'none' ? undefined : value })}
              options={[{ value: 'none', label: 'No department' }, ...departments.map((department) => ({ value: department.id, label: department.name }))]}
            />
            <AppSelect
              value={editing.sectorId ?? 'none'}
              onValueChange={(value) => setEditing({ ...editing, sectorId: value === 'none' ? undefined : value })}
              options={[{ value: 'none', label: 'No sector' }, ...sectors.map((sector) => ({ value: sector.id, label: sector.name }))]}
            />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(event) => setEditing({ ...editing, active: event.target.checked })} /> Active user</label>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
