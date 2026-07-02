import { Construction } from 'lucide-react'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="raised-card p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-primary/20 bg-primary-tint p-3 text-primary"><Construction className="h-6 w-6" /></div>
        <div>
          <p className="eyebrow">Planned workflow</p>
          <h2 className="mt-1 text-2xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            This route is guarded and ready for the next implementation phase. Foundation, role filtering, mock API state, and admin configuration are active now.
          </p>
        </div>
      </div>
    </section>
  )
}
