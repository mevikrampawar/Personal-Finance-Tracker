import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { toast } from 'sonner'
import { Plus, Trash2, CreditCard } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia } from '@/components/ui/alert-dialog'

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const { data: subscriptions, loading, add, remove } = useFirestoreCollection(user?.uid, 'subscriptions')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const totalMonthly = subscriptions.reduce((s, sub) => {
    const amt = sub.amount || 0
    if (sub.frequency === 'yearly') return s + amt / 12
    if (sub.frequency === 'weekly') return s + amt * 4.33
    return s + amt
  }, 0)

  const sanitizeAmount = (val) => {
    const n = Number(val)
    return { valid: !Number.isNaN(n) && isFinite(n) && n > 0, value: n }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim() || !amount) return toast.warning('Fill in name and amount')
    const { valid, value: amt } = sanitizeAmount(amount)
    if (!valid) return toast.warning('Enter a valid amount')
    try {
      await add({
        name: name.trim(),
        amount: amt,
        frequency,
      })
      setName('')
      setAmount('')
      setFrequency('monthly')
      toast.success('Subscription added')
    } catch {
      toast.error('Failed to add subscription')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Subscription deleted')
    } catch {
      toast.error('Failed to delete subscription')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-40" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Card>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Bills & Subscriptions</p>
        <h2 className="text-2xl font-bold tracking-tight">Subscriptions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track recurring bills and subscription costs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Monthly Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalMonthly)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              placeholder="Name (e.g., Netflix, Spotify)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:flex-1"
            />
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Amount"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="sm:w-28"
            />
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger size="sm" className="w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No subscriptions added yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {subscriptions.map((sub) => {
                const monthlyCost = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'weekly' ? sub.amount * 4.33 : sub.amount
                return (
                  <div key={sub.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(sub.amount)} / {sub.frequency} ({formatCurrency(monthlyCost)}/mo)
                      </p>
                    </div>
                    <AlertDialog open={deleteTarget?.id === sub.id} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                      <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-touch text-destructive"
                        onClick={() => setDeleteTarget(sub)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
                          <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                          <AlertDialogDescription>Delete &ldquo;{sub.name}&rdquo; subscription?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
