import { createContext, useContext, useCallback, useState, useRef } from 'react'
import { Toaster, toast as sonnerToast } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

const ToastContext = createContext(null)
const ConfirmContext = createContext(null)

export function AppProviders({ children }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const confirmResolveRef = useRef(null)

  const toast = useCallback((message, { type, ...rest } = {}) => {
    if (!type || type === 'info') sonnerToast(message, rest)
    else if (type === 'success') sonnerToast.success(message, rest)
    else if (type === 'error') sonnerToast.error(message, rest)
    else if (type === 'warning') sonnerToast.warning(message, rest)
    else sonnerToast(message, rest)
  }, [])

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setConfirmMessage(message)
      setConfirmOpen(true)
    })
  }, [])

  const handleConfirm = () => {
    confirmResolveRef.current?.(true)
    confirmResolveRef.current = null
    setConfirmOpen(false)
  }

  const handleCancel = () => {
    confirmResolveRef.current?.(false)
    confirmResolveRef.current = null
    setConfirmOpen(false)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ConfirmContext.Provider value={{ confirm }}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="bottom-right" />
          <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!open) handleCancel() }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm</AlertDialogTitle>
                <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
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
