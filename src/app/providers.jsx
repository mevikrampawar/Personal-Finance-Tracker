import { createContext, useContext, useCallback, useState } from 'react'
import ToastContainer from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const ToastContext = createContext(null)
const ConfirmContext = createContext(null)

let toastId = 0

export function AppProviders({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState({ open: false, message: '', resolve: null })

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, { type = 'info', duration = 3000 } = {}) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast],
  )

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({ open: true, message, resolve })
    })
  }, [])

  const handleConfirm = () => {
    confirmState.resolve?.(true)
    setConfirmState({ open: false, message: '', resolve: null })
  }

  const handleCancel = () => {
    confirmState.resolve?.(false)
    setConfirmState({ open: false, message: '', resolve: null })
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      <ConfirmContext.Provider value={{ confirm }}>
        {children}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <ConfirmDialog
          open={confirmState.open}
          message={confirmState.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export function useToastCtx() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastCtx must be used within AppProviders')
  return ctx
}

export function useConfirmCtx() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirmCtx must be used within AppProviders')
  return ctx
}
