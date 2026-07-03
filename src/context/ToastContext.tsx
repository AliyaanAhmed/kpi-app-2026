import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface ToastItem {
  id: number
  state: 'processing' | 'success' | 'error'
  title: string
  description?: string
  progress: number
  durationMs: number
}

interface ToastContextValue {
  showSuccessToast(title: string, description?: string): void
  showErrorToast(title: string, description?: string): void
  runActionToast<T>(
    action: () => Promise<T>,
    options: {
      processingTitle: string
      processingDescription?: string
      successTitle: string
      successDescription?: string
      errorTitle?: string
      minDurationMs?: number
    },
  ): Promise<T>
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const intervalsRef = useRef<Record<number, number>>({})

  const dismissToast = useCallback((id: number) => {
    const activeTimer = intervalsRef.current[id]
    if (activeTimer) {
      window.clearInterval(activeTimer)
      delete intervalsRef.current[id]
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showStaticToast = useCallback((state: 'success' | 'error', title: string, description?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const durationMs = state === 'success' ? 3600 : 4800
    setToasts((current) => [...current, { id, state, title, description, progress: 0, durationMs }])
    window.setTimeout(() => dismissToast(id), durationMs)
  }, [dismissToast])

  const showSuccessToast = useCallback((title: string, description?: string) => {
    showStaticToast('success', title, description)
  }, [showStaticToast])

  const showErrorToast = useCallback((title: string, description?: string) => {
    showStaticToast('error', title, description)
  }, [showStaticToast])

  const runActionToast = useCallback(async <T,>(
    action: () => Promise<T>,
    options: {
      processingTitle: string
      processingDescription?: string
      successTitle: string
      successDescription?: string
      errorTitle?: string
      minDurationMs?: number
    },
  ) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const minDurationMs = options.minDurationMs ?? 900
    const startedAt = Date.now()

    setToasts((current) => [
      ...current,
      {
        id,
        state: 'processing',
        title: options.processingTitle,
        description: options.processingDescription,
        progress: 5,
        durationMs: 0,
      },
    ])

    intervalsRef.current[id] = window.setInterval(() => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id && toast.state === 'processing'
            ? { ...toast, progress: Math.min(toast.progress + 7, 94) }
            : toast,
        ),
      )
    }, 170)

    try {
      const result = await action()
      const elapsed = Date.now() - startedAt
      if (elapsed < minDurationMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minDurationMs - elapsed))
      }
      const activeTimer = intervalsRef.current[id]
      if (activeTimer) {
        window.clearInterval(activeTimer)
        delete intervalsRef.current[id]
      }
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? { ...toast, state: 'success', title: options.successTitle, description: options.successDescription, progress: 0, durationMs: 3600 }
            : toast,
        ),
      )
      window.setTimeout(() => dismissToast(id), 3600)
      return result
    } catch (error) {
      const elapsed = Date.now() - startedAt
      if (elapsed < minDurationMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minDurationMs - elapsed))
      }
      const activeTimer = intervalsRef.current[id]
      if (activeTimer) {
        window.clearInterval(activeTimer)
        delete intervalsRef.current[id]
      }
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                state: 'error',
                title: options.errorTitle ?? 'Action failed',
                description: error instanceof Error ? error.message : 'Something went wrong.',
                progress: 0,
                durationMs: 4800,
              }
            : toast,
        ),
      )
      window.setTimeout(() => dismissToast(id), 4800)
      throw error
    }
  }, [dismissToast])

  const hasVisibleToast = toasts.length > 0
  const value = useMemo(() => ({ showSuccessToast, showErrorToast, runActionToast }), [showSuccessToast, showErrorToast, runActionToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {hasVisibleToast ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="pointer-events-none fixed inset-0 z-[950] bg-white/18 backdrop-blur-[5px] dark:bg-black/30"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          />
        ) : null}
      </AnimatePresence>
      <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[calc(100vw-2rem)] max-w-[390px] flex-col gap-3 sm:right-5">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
          <motion.div
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="pointer-events-auto overflow-hidden rounded-[16px] border border-border bg-white shadow-[0_18px_46px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-surface dark:shadow-[0_20px_56px_rgba(0,0,0,0.42)]"
            exit={{ opacity: 0, scale: 0.97, x: 26 }}
            initial={{ opacity: 0, scale: 0.98, x: 30 }}
            key={toast.id}
            layout
            transition={{ duration: 0.28, ease: [0.2, 0.85, 0.25, 1] }}
          >
            <div className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-white/70 dark:bg-white/10" />
              <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] transition duration-300',
                    toast.state === 'processing' && 'bg-info/10 text-info shadow-[inset_0_0_0_1px_rgba(62,107,132,0.16)]',
                    toast.state === 'success' && 'toast-success-icon bg-success/10 text-success shadow-[inset_0_0_0_1px_rgba(47,122,79,0.16)]',
                    toast.state === 'error' && 'bg-danger/10 text-danger shadow-[inset_0_0_0_1px_rgba(156,43,43,0.16)]',
                  ].filter(Boolean).join(' ')}
                >
                  {toast.state === 'processing' ? (
                    <>
                      <span className="absolute inset-1 rounded-[11px] border border-info/15" />
                      <Loader2 className="h-5 w-5 animate-spin [animation-duration:0.85s]" />
                    </>
                  ) : null}
                  {toast.state === 'success' ? <CheckCircle2 className="h-5 w-5" /> : null}
                  {toast.state === 'error' ? <AlertTriangle className="h-5 w-5" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={[
                      'mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                      toast.state === 'processing' && 'bg-info/10 text-info',
                      toast.state === 'success' && 'bg-success/10 text-success',
                      toast.state === 'error' && 'bg-danger/10 text-danger',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {toast.state === 'processing' ? 'Processing' : toast.state === 'success' ? 'Success' : 'Attention'}
                  </div>
                  <p className="truncate text-[15px] font-extrabold text-text">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-muted">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-primary-tint hover:text-primary"
                  onClick={() => dismissToast(toast.id)}
                  type="button"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-[3px] w-full bg-primary-tint/80 dark:bg-white/10">
              <div
                className={[
                  'h-full origin-left rounded-r-full transition-[width,background-color] duration-700 ease-out',
                  toast.state !== 'processing' && 'toast-progress-grow',
                  toast.state === 'processing' && 'bg-info',
                  toast.state === 'success' && 'bg-success',
                  toast.state === 'error' && 'bg-danger',
                ].filter(Boolean).join(' ')}
                key={`${toast.id}-${toast.state}`}
                style={{
                  width: `${toast.progress}%`,
                  animationDuration: toast.durationMs ? `${toast.durationMs}ms` : undefined,
                }}
              />
            </div>
            </div>
          </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
