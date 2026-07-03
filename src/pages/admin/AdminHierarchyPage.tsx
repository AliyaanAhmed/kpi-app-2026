import { motion } from 'framer-motion'
import { Building2, ChevronDown, Crown, Landmark } from 'lucide-react'
import { useState } from 'react'
import { mockApi } from '../../mockApi/mockApi'
import { useAppStore } from '../../store/appStore'
import { cn } from '../../lib/cn'

const sectorTone = ['#286CFF', '#4A9D5C', '#A855F7']

function initials(name?: string) {
  return (name ?? 'NA')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
}

export function AdminHierarchyPage() {
  useAppStore()
  const sectors = mockApi.getSectors()
  const departments = mockApi.getDepartments()
  const teams = mockApi.getTeams()
  const users = mockApi.getUsers()
  const directorGeneral = users.find((user) => user.role === 'director_general')
  const [expandedSectors, setExpandedSectors] = useState(() => new Set(sectors.map((sector) => sector.id)))

  function toggleSector(sectorId: string) {
    setExpandedSectors((current) => {
      const next = new Set(current)
      if (next.has(sectorId)) next.delete(sectorId)
      else next.add(sectorId)
      return next
    })
  }

  return (
    <div>
      <section className="overflow-hidden py-2">
        <motion.div
          className="mx-auto flex max-w-5xl flex-col items-center"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <motion.article
            className="relative z-[2] w-full max-w-[430px] rounded-[24px] border border-primary/25 bg-surface p-5 text-center shadow-premium"
            variants={{ hidden: { opacity: 0, y: -18, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1 } }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
              <Crown className="h-6 w-6" />
            </div>
            <p className="eyebrow mt-4">Director General</p>
            <h3 className="mt-1 text-xl font-bold">{directorGeneral?.name ?? 'Director General'}</h3>
            <p className="mt-2 text-sm text-muted">Enterprise oversight across every sector and KPI cycle.</p>
          </motion.article>

          <motion.div
            className="h-12 w-px bg-border"
            variants={{ hidden: { scaleY: 0, opacity: 0 }, visible: { scaleY: 1, opacity: 1 } }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}
          />

          <motion.div
            className="relative w-full"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute left-[12%] right-[12%] top-0 hidden h-px bg-border lg:block" />
            <div className="grid gap-5 lg:grid-cols-3">
              {sectors.map((sector, sectorIndex) => {
                const sectorDepartments = departments.filter((department) => department.sectorId === sector.id)
                const executive = users.find((user) => user.id === sector.executiveDirectorId)
                const expanded = expandedSectors.has(sector.id)
                const color = sectorTone[sectorIndex % sectorTone.length]

                return (
                  <motion.article
                    className="relative"
                    key={sector.id}
                    variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="mx-auto hidden h-8 w-px bg-border lg:block" />
                    <button
                      className="group w-full rounded-[24px] border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:shadow-premium"
                      onClick={() => toggleSector(sector.id)}
                      style={{ borderColor: `${color}55` }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white transition group-hover:scale-105"
                            style={{ backgroundColor: color }}
                          >
                            <Landmark className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="eyebrow">Sector</p>
                            <h3 className="truncate text-lg font-bold">{sector.name}</h3>
                            <p className="mt-1 text-xs text-muted">{executive?.name}</p>
                          </div>
                        </div>
                        <ChevronDown className={cn('mt-2 h-4 w-4 shrink-0 text-muted transition', expanded && 'rotate-180 text-primary')} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-border bg-surface-raised p-3">
                          <p className="font-display text-2xl font-extrabold">{sectorDepartments.length}</p>
                          <p className="text-xs text-muted">Departments</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface-raised p-3">
                          <p className="font-display text-2xl font-extrabold">
                            {sectorDepartments.reduce((sum, department) => {
                              const team = teams.find((item) => item.departmentId === department.id)
                              return sum + (team?.focalPointIds.length ?? 0)
                            }, 0)}
                          </p>
                          <p className="text-xs text-muted">Focal Points</p>
                        </div>
                      </div>
                    </button>

                    <motion.div
                      className="overflow-hidden"
                      initial={false}
                      animate={expanded ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: 'easeInOut' }}
                    >
                      <div className="mx-auto h-6 w-px bg-border" />
                      <div className="space-y-3">
                        {sectorDepartments.map((department, departmentIndex) => {
                          const team = teams.find((item) => item.departmentId === department.id)
                          const director = users.find((user) => user.id === department.directorId)
                          const focalPoints = users.filter((user) => team?.focalPointIds.includes(user.id))

                          return (
                            <motion.div
                              className="relative rounded-[22px] border border-border bg-surface-raised p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
                              key={department.id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: departmentIndex * 0.04, duration: 0.25 }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                                  <Building2 className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold">{department.name}</p>
                                      <p className="mt-1 truncate text-xs text-muted">{director?.name}</p>
                                    </div>
                                    <span className="status-pill border-primary/15 bg-primary-tint text-primary">
                                      Director
                                    </span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {focalPoints.map((focalPoint) => (
                                      <div
                                        className="flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold"
                                        key={focalPoint.id}
                                      >
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                                          {initials(focalPoint.name)}
                                        </span>
                                        <span className="max-w-[150px] truncate">{focalPoint.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  </motion.article>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
