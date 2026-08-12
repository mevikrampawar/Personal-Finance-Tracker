import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Central data store: DataProvider (src/app/DataProvider.jsx) subscribes to every
// user collection once and shares the result through this context. Pages consume it
// via useFirestoreCollection, so all reads come from a single source of truth and
// no page creates its own duplicate onSnapshot listener.
export const DataContext = createContext(null)

export function useLocalFirestoreCollection(uid, collectionName, limitParam = 1000, enabled = true) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const unsubRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    if (!uid) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = collection(db, 'users', uid, collectionName)
    const q = query(ref, orderBy('createdAt', 'desc'), limit(limitParam))

    unsubRef.current = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        setData(items)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubRef.current?.()
  }, [uid, collectionName, limitParam, enabled])

  const add = useCallback(
    async (payload) => {
      if (!uid) throw new Error('Not authenticated')
      const ref = collection(db, 'users', uid, collectionName)
      const { createdAt: _, ...rest } = payload
      return addDoc(ref, { ...rest, createdAt: new Date(), updatedAt: new Date() })
    },
    [uid, collectionName],
  )

  const update = useCallback(
    async (id, payload) => {
      if (!uid) throw new Error('Not authenticated')
      const ref = doc(db, 'users', uid, collectionName, id)
      const { createdAt: _, ...rest } = payload
      return updateDoc(ref, { ...rest, updatedAt: new Date() })
    },
    [uid, collectionName],
  )

  const remove = useCallback(
    async (id) => {
      if (!uid) throw new Error('Not authenticated')
      const ref = doc(db, 'users', uid, collectionName, id)
      return deleteDoc(ref)
    },
    [uid, collectionName],
  )

  return { data, loading, error, add, update, remove }
}

export function useFirestoreCollection(uid, collectionName, limitParam = 1000) {
  const ctx = useContext(DataContext)
  const ownedByProvider = Boolean(ctx && ctx[collectionName])

  // Always call the local hook (rules of hooks); when the central provider owns
  // this collection we skip attaching our own listener and use its snapshot.
  const local = useLocalFirestoreCollection(uid, collectionName, limitParam, !ownedByProvider)

  if (ownedByProvider) return ctx[collectionName]
  return local
}
