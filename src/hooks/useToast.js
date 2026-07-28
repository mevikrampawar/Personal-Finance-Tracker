import { useState, useCallback, useRef } from 'react'

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, { type = 'info', duration = 3000 } = {}) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => removeToast(id), duration)
      }
      return id
    },
    [removeToast],
  )

  const success = useCallback((msg, opts) => toast(msg, { ...opts, type: 'success' }), [toast])
  const error = useCallback((msg, opts) => toast(msg, { ...opts, type: 'error' }), [toast])
  const warning = useCallback((msg, opts) => toast(msg, { ...opts, type: 'warning' }), [toast])

  return { toasts, toast, success, error, warning, removeToast }
}
