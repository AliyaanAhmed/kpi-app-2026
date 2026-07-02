import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'

interface ToastItem {
  id: number
  state: 'processing' | 'success' | 'error'
  title: string
  description?: string
  progress: number
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
    setToasts((current) => [...current, { id, state, title, description, progress: 100 }])
    window.setTimeout(() => dismissToast(id), state === 'success' ? 3200 : 4200)
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
    const minDurationMs = options.minDurationMs ?? 1200
    const startedAt = Date.now()

    setToasts((current) => [
      ...current,
      {
        id,
        state: 'processing',
        title: options.processingTitle,
        description: options.processingDescription,
        progress: 5,
      },
    ])

    intervalsRef.current[id] = window.setInterval(() => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id && toast.state === 'processing'
            ? { ...toast, progress: Math.min(toast.progress + 5, 95) }
            : toast,
        ),
      )
    }, 120)

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
            ? { ...toast, state: 'success', title: options.successTitle, description: options.successDescription, progress: 100 }
            : toast,
        ),
      )
      window.setTimeout(() => dismissToast(id), 2600)
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
                progress: 100,
              }
            : toast,
        ),
      )
      window.setTimeout(() => dismissToast(id), 4200)
      throw error
    }
  }, [dismissToast])

  const isProcessing = toasts.some((toast) => toast.state === 'processing')
  const value = useMemo(() => ({ showSuccessToast, showErrorToast, runActionToast }), [showSuccessToast, showErrorToast, runActionToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isProcessing ? <div className="pointer-events-none fixed inset-0 z-[950] bg-black/10 backdrop-blur-[3px] dark:bg-black/25" /> : null}
      <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[calc(100vw-2rem)] max-w-[390px] flex-col gap-3 sm:right-5">
        {toasts.map((toast) => (
          <div
            className="pointer-events-auto overflow-hidden rounded-[18px] border border-border bg-surface shadow-modal"
            key={toast.id}
          >
            <div className="border-b border-border bg-surface-raised px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]',
                    toast.state === 'processing' && 'bg-info/10 text-info',
                    toast.state === 'success' && 'bg-success/10 text-success',
                    toast.state === 'error' && 'bg-danger/10 text-danger',
                  ].filter(Boolean).join(' ')}
                >
                  {toast.state === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {toast.state === 'success' ? <CheckCircle2 className="h-5 w-5" /> : null}
                  {toast.state === 'error' ? <AlertTriangle className="h-5 w-5" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={[
                      'mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
                      toast.state === 'processing' && 'bg-info/10 text-info',
                      toast.state === 'success' && 'bg-success/10 text-success',
                      toast.state === 'error' && 'bg-danger/10 text-danger',
                    ].filter(Boolean).join(' ')}
                  >
                    {toast.state}
                  </div>
                  <p className="truncate text-sm font-bold text-text">{toast.title}</p>
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
            {toast.description ? (
              <div className="px-4 py-3">
                <p className="whitespace-pre-line text-xs font-medium leading-5 text-muted">{toast.description}</p>
              </div>
            ) : null}
            <div className="h-1 w-full bg-primary-tint">
              <div
                className={[
                  'h-full transition-[width,background-color] duration-200 ease-linear',
                  toast.state === 'processing' && 'bg-info',
                  toast.state === 'success' && 'bg-success',
                  toast.state === 'error' && 'bg-danger',
                ].filter(Boolean).join(' ')}
                style={{ width: `${toast.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
