import { useState, useEffect, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'

export function useConfirm() {
  const [state, setState] = useState({ open: false, message: '', resolve: null })

  const confirm = (message) => {
    return new Promise((resolve) => {
      setState({ open: true, message, resolve })
    })
  }

  const handleConfirm = () => {
    state.resolve?.(true)
    setState({ open: false, message: '', resolve: null })
  }

  const handleCancel = () => {
    state.resolve?.(false)
    setState({ open: false, message: '', resolve: null })
  }

  return { confirm, state, handleConfirm, handleCancel }
}

export default function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl mx-4">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-accent transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
