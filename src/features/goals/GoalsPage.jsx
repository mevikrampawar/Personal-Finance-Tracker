import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { toLocalDate, formatShortDate } from '@/lib/date'
import { toast } from 'sonner'
import { Plus, Trash2, Target, PartyPopper, PiggyBank, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia } from '@/components/ui/alert-dialog'

export default function GoalsPage() {
  const { user } = useAuth()
  const { data: goals, loading, add, update, remove } = useFirestoreCollection(user?.uid, 'goals')
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [contributions, setContributions] = useState({})
  const [showCelebrate, setShowCelebrate] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const sanitizeAmount = (val) => {
    const n = Number(val)
    return { valid: !Number.isNaN(n) && isFinite(n) && n > 0, value: n }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim() || !targetAmount) return toast.warning('Please fill in name and target amount')
    const { valid, value: amt } = sanitizeAmount(targetAmount)
    if (!valid) return toast.warning('Enter a valid target amount')
    try {
      await add({
        name: name.trim(),
        targetAmount: amt,
        ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
        currentAmount: 0,
      })
      setName('')
      setTargetAmount('')
      setTargetDate('')
      toast.success('Goal created')
    } catch {
      toast.error('Failed to create goal')
    }
  }

  const handleContribute = async (goal) => {
    const { valid, value: amt } = sanitizeAmount(contributions[goal.id])
    if (!valid) return toast.warning('Enter a valid contribution amount')
    const newAmount = (goal.currentAmount || 0) + amt
    const pct = Math.min((newAmount / goal.targetAmount) * 100, 100)
    const log = { amount: amt, addedAt: new Date() }
    const existingLogs = Array.isArray(goal.contributions) ? goal.contributions : []
    try {
      await update(goal.id, { currentAmount: newAmount, contributions: [...existingLogs, log] })
      setContributions((prev) => ({ ...prev, [goal.id]: '' }))
      if (pct >= 100) {
        setShowCelebrate(goal.id)
        setTimeout(() => setShowCelebrate(null), 4000)
      }
      toast.success('Contribution added')
    } catch {
      toast.error('Failed to add contribution')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Goal deleted')
    } catch {
      toast.error('Failed to delete goal')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-40" />
        </div>
        <Card>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Planning</p>
        <h2 className="text-2xl font-bold tracking-tight">Savings Goals</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track progress toward your financial targets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input
              type="text"
              placeholder="Goal name (e.g., Emergency Fund)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:flex-1"
            />
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Target amount"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="sm:w-36"
            />
            <div className="sm:w-40">
              <DatePicker value={targetDate} onChange={setTargetDate} placeholder="Target date" />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No goals yet. Create your first savings goal above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = Math.min(((goal.currentAmount || 0) / goal.targetAmount) * 100, 100)
            const isComplete = pct >= 100
            return (
              <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <CardTitle>{goal.name}</CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Target: {formatCurrency(goal.targetAmount)}
                          {goal.targetDate && <> · {formatShortDate(toLocalDate(goal.targetDate))}</>}
                        </p>
                      </div>
                      {isComplete && <Badge variant="default" className="shrink-0 ml-2">Completed</Badge>}
                    </div>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={pct}>
                    <ProgressLabel>{Math.round(pct)}%</ProgressLabel>
                    <ProgressValue>{formatCurrency(goal.currentAmount || 0)} / {formatCurrency(goal.targetAmount)}</ProgressValue>
                  </Progress>

                  {showCelebrate === goal.id && (
                    <div className="flex items-center gap-2 rounded-lg bg-income/10 p-2.5 text-sm text-income animate-in">
                      <PartyPopper className="h-4 w-4" /> Goal reached!
                    </div>
                  )}

                  {!isComplete && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Add contribution"
                        min="0"
                        step="0.01"
                        value={contributions[goal.id] || ''}
                        onChange={(e) => setContributions((p) => ({ ...p, [goal.id]: e.target.value }))}
                      />
                      <Button variant="secondary" onClick={() => handleContribute(goal)}>Add</Button>
                    </div>
                  )}

                  {(Array.isArray(goal.contributions) && goal.contributions.length > 0) && (
                    <div className="space-y-2">
                      <Separator />
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Contribution History
                      </div>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {[...goal.contributions].reverse().map((c, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-1.5 text-xs">
                            <div className="flex items-center gap-2">
                              <PiggyBank className="h-3 w-3 text-muted-foreground/60" />
                              <span className="text-muted-foreground">
                                {c.addedAt?.toDate
                                  ? formatShortDate(toLocalDate(c.addedAt))
                                  : 'Today'}
                              </span>
                            </div>
                            <span className="font-medium tabular-nums text-income">+{formatCurrency(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <AlertDialog open={deleteTarget?.id === goal.id} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-touch text-destructive"
                          onClick={() => setDeleteTarget(goal)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
                          <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete &ldquo;{goal.name}&rdquo;? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
