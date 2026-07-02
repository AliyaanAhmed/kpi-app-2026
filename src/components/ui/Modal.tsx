import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange(open: boolean): void
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onOpenChange, icon, eyebrow, title, description, children, footer }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              className="max-h-[90vh] w-[min(920px,calc(100vw-32px))] overflow-hidden rounded-[22px] border border-border bg-surface-raised shadow-modal"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-start justify-between gap-5 border-b border-border px-6 py-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary-tint text-primary">
                    {icon}
                  </div>
                  <div>
                    <p className="eyebrow">{eyebrow}</p>
                    <Dialog.Title className="mt-1 font-display text-2xl font-bold text-text">{title}</Dialog.Title>
                    <Dialog.Description className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      {description}
                    </Dialog.Description>
                  </div>
                </div>
                <Dialog.Close className="btn-secondary h-10 w-10 rounded-full p-0" aria-label="Close modal">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
              <div className="max-h-[58vh] overflow-y-auto px-6 py-5">{children}</div>
              {footer ? <div className="border-t border-border px-6 py-4">{footer}</div> : null}
            </motion.div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
