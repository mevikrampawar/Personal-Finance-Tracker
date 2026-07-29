import { useState, useEffect, useCallback, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useFirestoreCollection(uid, collectionName, limitParam = 1000) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const unsubRef = useRef(null)

  useEffect(() => {
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
  }, [uid, collectionName, limitParam])

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
