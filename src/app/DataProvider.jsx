import { useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { DataContext, useFirestoreCollection } from '@/hooks/useFirestore'

// Central data store. Subscribes to every user collection exactly once and exposes
// them through context. All pages read through useFirestoreCollection, which returns
// the shared snapshot instead of opening its own Firestore listener, keeping data
// synchronized across the whole app with a single source of truth per collection.
export function DataProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const transactions = useFirestoreCollection(uid, 'transactions', 10000)
  const categories = useFirestoreCollection(uid, 'categories')
  const recurringTransactions = useFirestoreCollection(uid, 'recurringTransactions')
  const goals = useFirestoreCollection(uid, 'goals')
  const assets = useFirestoreCollection(uid, 'assets')
  const liabilities = useFirestoreCollection(uid, 'liabilities')
  const subscriptions = useFirestoreCollection(uid, 'subscriptions')

  const value = useMemo(
    () => ({ transactions, categories, recurringTransactions, goals, assets, liabilities, subscriptions }),
    [transactions, categories, recurringTransactions, goals, assets, liabilities, subscriptions],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
