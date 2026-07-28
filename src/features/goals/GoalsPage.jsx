import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { useToastCtx, useConfirmCtx } from '@/app/providers'
import { Plus, Trash2, Target, PartyPopper } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia } from '@/components/ui/alert-dialog'

export default function GoalsPage() {
  const { user } = useAuth()
  const { data: goals, loading, add, update, remove } = useFirestoreCollection(user?.uid, 'goals')
  const { toast } = useToastCtx()
  const { confirm } = useConfirmCtx()
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [contributions, setContributions] = useState({})
  const [showCelebrate, setShowCelebrate] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

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
    const amt = Number(contributions[goal.id] || 0)
    if (!amt || amt <= 0) return toast('Enter a valid contribution amount', { type: 'warning' })
    const newAmount = (goal.currentAmount || 0) + amt
    const pct = Math.min((newAmount / goal.targetAmount) * 100, 100)
    try {
      await update(goal.id, { currentAmount: newAmount })
      setContributions((prev) => ({ ...prev, [goal.id]: '' }))
      if (pct >= 100) {
        setShowCelebrate(goal.id)
        setTimeout(() => setShowCelebrate(null), 4000)
      }
      toast('Contribution added', { type: 'success' })
    } catch {
      toast('Failed to add contribution', { type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
      toast('Goal deleted', { type: 'success' })
    } catch {
      toast('Failed to delete goal', { type: 'error' })
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
      <div>
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
              placeholder="Target amount"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="sm:w-36"
            />
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="sm:w-40"
            />
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
                    <div>
                      <CardTitle>{goal.name}</CardTitle>
                      {goal.targetDate && (
                        <p className="text-xs text-muted-foreground">Target: {goal.targetDate}</p>
                      )}
                    </div>
                    {isComplete && <Badge variant="default">Completed</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct}>
                    <ProgressLabel>{Math.round(pct)}%</ProgressLabel>
                    <ProgressValue>{formatCurrency(goal.currentAmount || 0)} / {formatCurrency(goal.targetAmount)}</ProgressValue>
                  </Progress>

                  {showCelebrate === goal.id && (
                    <div className="flex items-center gap-2 rounded-lg bg-income/10 p-2 text-sm text-income">
                      <PartyPopper className="h-4 w-4" /> Goal reached!
                    </div>
                  )}

                  {!isComplete && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Add contribution"
                        min="0"
                        step="0.01"
                        value={contributions[goal.id] || ''}
                        onChange={(e) => setContributions((p) => ({ ...p, [goal.id]: e.target.value }))}
                      />
                      <Button variant="secondary" onClick={() => handleContribute(goal)}>Add</Button>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <AlertDialog open={deleteTarget?.id === goal.id} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
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
