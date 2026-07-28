import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { useToastCtx, useConfirmCtx } from '@/app/providers'
import { Plus, Trash2, CreditCard, Calendar } from 'lucide-react'

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const { data: subscriptions, add, remove } = useFirestoreCollection(user?.uid, 'subscriptions')
  const { toast } = useToastCtx()
  const { confirm } = useConfirmCtx()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [nextDate, setNextDate] = useState('')

  const totalMonthly = subscriptions.reduce((s, sub) => {
    const amt = sub.amount || 0
    if (sub.frequency === 'yearly') return s + amt / 12
    if (sub.frequency === 'weekly') return s + amt * 4.33
    return s + amt
  }, 0)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim() || !amount) return toast('Fill in name and amount', { type: 'warning' })
    await add({
      name: name.trim(),
      amount: parseFloat(amount),
      frequency,
      nextDate: nextDate || null,
    })
    setName('')
    setAmount('')
    setNextDate('')
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this subscription?')
    if (!ok) return
    await remove(id)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Bills & Subscriptions</p>
        <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track recurring bills and subscription costs.</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="text-sm text-muted-foreground">Total Monthly Cost</div>
        <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalMonthly)}</p>
        <p className="text-xs text-muted-foreground mt-1">{subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleAdd} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="text" placeholder="Name (e.g., Netflix, Spotify)" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Amount" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
          </select>
          <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </form>

      {/* List */}
      <div className="rounded-xl border bg-card shadow-sm divide-y">
        {subscriptions.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No subscriptions tracked yet</p>
          </div>
        ) : (
          subscriptions.map((sub) => {
            const monthlyCost = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'weekly' ? sub.amount * 4.33 : sub.amount
            return (
              <div key={sub.id} className="flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(sub.amount)} / {sub.frequency} ({formatCurrency(monthlyCost)}/mo)
                  </p>
                </div>
                <button onClick={() => handleDelete(sub.id)} className="rounded p-1.5 hover:bg-destructive/10 text-destructive transition-colors" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
