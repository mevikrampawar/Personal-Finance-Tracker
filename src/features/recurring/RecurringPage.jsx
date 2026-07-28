import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatYearMonth } from '@/lib/date'
import { useToastCtx, useConfirmCtx } from '@/app/providers'
import { Plus, Trash2, Play } from 'lucide-react'

export default function RecurringPage() {
  const { user } = useAuth()
  const { data: recurring, add, remove } = useFirestoreCollection(user?.uid, 'recurringTransactions')
  const { data: transactions, add: addTransaction } = useFirestoreCollection(user?.uid, 'transactions')
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const { toast } = useToastCtx()
  const { confirm } = useConfirmCtx()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim() || !amount || !dayOfMonth) return toast('Please complete the form', { type: 'warning' })
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast('Enter a valid amount', { type: 'warning' })
    if (type === 'expense' && !category) return toast('Select a category for expenses', { type: 'warning' })

    await add({
      description: description.trim(),
      amount: amt,
      type,
      category: type === 'expense' ? category : '',
      dayOfMonth: Math.min(Math.max(Number(dayOfMonth), 1), 31),
    })
    setDescription('')
    setAmount('')
    setCategory('')
    setDayOfMonth('1')
  }

  const handleApply = async () => {
    if (recurring.length === 0) return toast('No recurring transactions to apply', { type: 'warning' })
    const now = new Date()
    const periodKey = formatYearMonth(now)
    let count = 0

    for (const r of recurring) {
      const alreadyExists = transactions.some(
        (t) => t.recurringId === r.id && t.recurringPeriod === periodKey,
      )
      if (alreadyExists) continue

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const txDate = new Date(now.getFullYear(), now.getMonth(), Math.min(r.dayOfMonth || 1, daysInMonth), 12, 0, 0, 0)

      await addTransaction({
        description: r.description,
        type: r.type,
        category: r.type === 'expense' ? r.category : '',
        amount: r.amount,
        createdAt: txDate,
        recurringId: r.id,
        recurringPeriod: periodKey,
      })
      count++
    }

    toast(count > 0 ? `Applied ${count} recurring transaction(s)` : 'Recurring transactions already exist for this month', { type: count > 0 ? 'success' : 'info' })
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this recurring transaction template?')
    if (!ok) return
    await remove(id)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Automation</p>
        <h2 className="text-2xl font-bold tracking-tight">Recurring</h2>
        <p className="mt-1 text-sm text-muted-foreground">Set up monthly recurring entries and apply them.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <input
              type="text"
              placeholder="e.g., Salary, Rent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <input
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
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-2">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'expense'
                        ? 'border-expense bg-expense/10 text-expense'
                        : 'border-income bg-income/10 text-income'
                      : 'hover:bg-accent'
                  }`}
                >
                  {t === 'expense' ? '📉' : '📈'} {t}
                </button>
              ))}
            </div>
          </div>
          {type === 'expense' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Day of Month</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        </div>
        <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Recurring Transaction
        </button>
      </form>

      {/* Apply Button */}
      <button onClick={handleApply} className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
        <Play className="h-4 w-4" /> Apply Recurring for Current Month
      </button>

      {/* List */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Active Recurring</h3>
        </div>
        {recurring.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No recurring transactions yet</div>
        ) : (
          <ul className="divide-y">
            {recurring.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div>
                  <span className="text-sm font-medium">{r.description}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.type} · {formatCurrency(r.amount || 0)} · day {r.dayOfMonth}
                  </span>
                </div>
                <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 hover:bg-destructive/10 text-destructive transition-colors" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
