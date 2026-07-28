import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { useToastCtx, useConfirmCtx } from '@/app/providers'
import { Plus, Trash2, Target, PartyPopper } from 'lucide-react'

export default function GoalsPage() {
  const { user } = useAuth()
  const { data: goals, add, update, remove } = useFirestoreCollection(user?.uid, 'goals')
  const { toast } = useToastCtx()
  const { confirm } = useConfirmCtx()
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [contribution, setContribution] = useState({})
  const [showCelebrate, setShowCelebrate] = useState(null)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim() || !targetAmount) return toast('Please fill in name and target amount', { type: 'warning' })
    const amt = parseFloat(targetAmount)
    if (!amt || amt <= 0) return toast('Enter a valid target amount', { type: 'warning' })
    try {
      await add({
        name: name.trim(),
        targetAmount: amt,
        targetDate: targetDate || null,
        currentAmount: 0,
      })
      setName('')
      setTargetAmount('')
      setTargetDate('')
      toast('Goal created', { type: 'success' })
    } catch {
      toast('Failed to create goal', { type: 'error' })
    }
  }

  const handleContribute = async (goal) => {
    const amt = Number(contribution[goal.id] || 0)
    if (!amt || amt <= 0) return
    const newAmount = (goal.currentAmount || 0) + amt
    const pct = Math.min((newAmount / goal.targetAmount) * 100, 100)
    try {
      await update(goal.id, { currentAmount: newAmount })
      setContribution((prev) => ({ ...prev, [goal.id]: '' }))
      if (pct >= 100) {
        setShowCelebrate(goal.id)
        setTimeout(() => setShowCelebrate(null), 3000)
      }
      toast('Contribution added', { type: 'success' })
    } catch {
      toast('Failed to add contribution', { type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this goal?')
    if (!ok) return
    try {
      await remove(id)
      toast('Goal deleted', { type: 'success' })
    } catch {
      toast('Failed to delete goal', { type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Planning</p>
        <h2 className="text-2xl font-bold tracking-tight">Savings Goals</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track progress toward your financial targets.</p>
      </div>

      {/* Add Goal */}
      <form onSubmit={handleAdd} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Goal name (e.g., Emergency Fund)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="number"
            placeholder="Target amount"
            min="0"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Create Goal
          </button>
        </div>
      </form>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
          <Target className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No goals yet. Create your first savings goal above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = Math.min(((goal.currentAmount || 0) / goal.targetAmount) * 100, 100)
            const isComplete = pct >= 100
            return (
              <div key={goal.id} className={`rounded-xl border bg-card p-5 shadow-sm transition-all ${isComplete ? 'border-income/50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{goal.name}</h3>
                    {goal.targetDate && (
                      <p className="text-xs text-muted-foreground">Target: {goal.targetDate}</p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="rounded p-1.5 hover:bg-destructive/10 text-destructive transition-colors" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="tabular-nums font-medium">{formatCurrency(goal.currentAmount || 0)}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${isComplete ? 'bg-income' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-right">{Math.round(pct)}% achieved</p>
                </div>

                {showCelebrate === goal.id && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-income/10 p-2 text-sm text-income">
                    <PartyPopper className="h-4 w-4" /> Goal reached!
                  </div>
                )}

                {!isComplete && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      placeholder="Add amount"
                      min="0"
                      step="0.01"
                      value={contribution[goal.id] || ''}
                      onChange={(e) => setContribution((p) => ({ ...p, [goal.id]: e.target.value }))}
                      className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleContribute(goal)}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
