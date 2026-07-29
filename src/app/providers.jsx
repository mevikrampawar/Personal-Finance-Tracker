import { createContext, useContext, useCallback, useState, useRef } from 'react'
import { Toaster } from 'sonner'
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

const ConfirmContext = createContext(null)

export function AppProviders({ children }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const confirmResolveRef = useRef(null)

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
    <ConfirmContext.Provider value={{ confirm }}>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" closeButton duration={3000} className="toaster-custom" />
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
  )
}

export function useConfirmCtx() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirmCtx must be used within AppProviders')
  return ctx
}
