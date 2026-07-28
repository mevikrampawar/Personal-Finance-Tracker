import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'border-income/30 bg-income/10 text-income',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-border bg-card text-foreground',
}

export default function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 sm:bottom-6 lg:bottom-6">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 min-w-[280px] max-w-[380px]',
              STYLES[t.type],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button
              onClick={() => onRemove(t.id)}
              className="shrink-0 rounded-md p-0.5 hover:bg-foreground/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
