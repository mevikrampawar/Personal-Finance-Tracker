import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatInputDate } from '@/lib/date'
import { useToastCtx } from '@/app/providers'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Save, X } from 'lucide-react'

export default function TransactionFormPage() {
  const { user } = useAuth()
  const { data: transactions, add, update } = useFirestoreCollection(user?.uid, 'transactions')
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const { toast } = useToastCtx()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const [description, setDescription] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(formatInputDate(new Date()))

  const isEditing = !!editId

  useEffect(() => {
    if (editId) {
      const t = transactions.find((x) => x.id === editId)
      if (t) {
        setDescription(t.description || '')
        setType(t.type || 'expense')
        setCategory(t.category || '')
        setAmount(String(t.amount || ''))
        const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt)
        setDate(formatInputDate(d))
      }
    }
  }, [editId, transactions])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) return toast('Please enter a description', { type: 'warning' })
    if (type === 'expense' && !category) return toast('Please select a category for expenses', { type: 'warning' })
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast('Please enter a valid amount', { type: 'warning' })
    if (!date) return toast('Please select a date', { type: 'warning' })

    const [y, m, d] = date.split('-')
    const transactionDate = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0)

    const payload = {
      description: description.trim(),
      type,
      category: type === 'expense' ? category : '',
      amount: amt,
      createdAt: transactionDate,
    }

    try {
      if (isEditing) {
        await update(editId, payload)
      } else {
        await add(payload)
      }
      toast(isEditing ? 'Transaction updated' : 'Transaction added', { type: 'success' })
      navigate('/app/transactions')
    } catch (err) {
      toast('Failed to save transaction. Please try again.', { type: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Transaction</p>
        <h2 className="text-2xl font-bold tracking-tight">{isEditing ? 'Edit Transaction' : 'Add Transaction'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Capture income or spending with category and date.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <input
              id="description"
              type="text"
              placeholder="e.g., Grocery, Salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-2">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'expense'
                        ? 'border-expense bg-expense/10 text-expense'
                        : 'border-income bg-income/10 text-income'
                      : 'hover:bg-accent'
                  }`}
                >
                  {t === 'expense' ? '📉 Expense' : '📈 Income'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {type === 'expense' && (
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">Amount</label>
            <input
              id="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            {isEditing ? 'Update Transaction' : 'Add Transaction'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => navigate('/app/transactions')}
              className="flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
