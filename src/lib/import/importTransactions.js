import { collection, doc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const BATCH_SIZE = 400

export async function importTransactions(uid, transactions, onProgress) {
  if (!uid) throw new Error('Not authenticated')
  if (!transactions.length) return 0

  const ref = collection(db, 'users', uid, 'transactions')
  const now = new Date()
  let written = 0

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const chunk = transactions.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    for (const t of chunk) {
      batch.set(doc(ref), {
        description: t.description,
        type: t.type === 'income' ? 'income' : 'expense',
        category: t.category || '',
        amount: Math.abs(Number(t.amount) || 0),
        transactionDate: t.date instanceof Date ? t.date : new Date(t.date),
        createdAt: now,
        updatedAt: now,
      })
    }
    await batch.commit()
    written += chunk.length
    onProgress?.(written)
  }

  return written
}
