import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatYearMonth } from '@/lib/date'
import { useToastCtx, useConfirmCtx } from '@/app/providers'
import { Plus, Trash2, Play } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia } from '@/components/ui/alert-dialog'

export default function RecurringPage() {
  const { user } = useAuth()
  const { data: recurring, loading, add, remove } = useFirestoreCollection(user?.uid, 'recurringTransactions')
  const { data: transactions, add: addTransaction } = useFirestoreCollection(user?.uid, 'transactions')
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const { toast } = useToastCtx()
  const { confirm } = useConfirmCtx()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim() || !amount || !dayOfMonth) return toast('Please complete the form', { type: 'warning' })
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast('Enter a valid amount', { type: 'warning' })
    if (type === 'expense' && !category) return toast('Select a category for expenses', { type: 'warning' })

    try {
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
      toast('Recurring transaction added', { type: 'success' })
    } catch {
      toast('Failed to add recurring transaction', { type: 'error' })
    }
  }

  const handleApply = async () => {
    if (recurring.length === 0) return toast('No recurring transactions to apply', { type: 'warning' })
    const now = new Date()
    const periodKey = formatYearMonth(now)
    let count = 0
    let errors = 0

    for (const r of recurring) {
      const alreadyExists = transactions.some(
        (t) => t.recurringId === r.id && t.recurringPeriod === periodKey,
      )
      if (alreadyExists) continue

      try {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const txDate = new Date(now.getFullYear(), now.getMonth(), Math.min(r.dayOfMonth || 1, daysInMonth), 12, 0, 0, 0)

        await addTransaction({
          description: r.description,
          type: r.type,
          category: r.type === 'expense' ? r.category : '',
          amount: r.amount,
          transactionDate: txDate,
          recurringId: r.id,
          recurringPeriod: periodKey,
        })
        count++
      } catch {
        errors++
      }
    }

    if (errors > 0) {
      toast(`Applied ${count} transactions, ${errors} failed`, { type: 'warning' })
    } else if (count > 0) {
      toast(`Applied ${count} recurring transaction(s)`, { type: 'success' })
    } else {
      toast('Recurring transactions already exist for this month', { type: 'info' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
      toast('Recurring transaction deleted', { type: 'success' })
    } catch {
      toast('Failed to delete recurring transaction', { type: 'error' })
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
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Automation</p>
        <h2 className="text-2xl font-bold tracking-tight">Recurring</h2>
        <p className="mt-1 text-sm text-muted-foreground">Set up monthly recurring entries and apply them.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Recurring Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="text"
                placeholder="e.g., Salary, Rent"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <Input
                type="number"
                placeholder="Amount"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type === 'expense' && (
                <div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Input
                type="number"
                placeholder="Day of month (1-28)"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Add Recurring Transaction
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleApply}>
        <Play className="h-4 w-4" /> Apply Recurring for Current Month
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Active Recurring</CardTitle>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No recurring transactions yet</p>
          ) : (
            <div className="divide-y">
              {recurring.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.type} &middot; {formatCurrency(r.amount || 0)} &middot; day {r.dayOfMonth}
                    </p>
                  </div>
                  <AlertDialog open={deleteTarget?.id === r.id} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
                        <AlertDialogTitle>Delete Recurring</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete this recurring transaction template?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
