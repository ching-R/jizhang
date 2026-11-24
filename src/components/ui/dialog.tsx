import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  )
}

export function DialogContent({
  children,
  className,
  side = 'center',
}: {
  children: ReactNode
  className?: string
  side?: 'center' | 'bottom'
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1e1b17]/45 fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 bg-surface text-ink shadow-2xl focus:outline-none fade-in',
          side === 'bottom'
            ? 'bottom-0 left-1/2 max-h-[92dvh] w-full max-w-[480px] -translate-x-1/2 overflow-y-auto rounded-t-[28px] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]'
            : 'left-1/2 top-1/2 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] p-5',
          className,
        )}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold', className)}>{children}</DialogPrimitive.Title>
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted', className)}>{children}</DialogPrimitive.Description>
}
