import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatYearMonth } from '@/lib/date'
import { Plus, Trash2, Play, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function RecurringPage() {
  const { user } = useAuth()
  const { data: recurring, loading, add, remove } = useFirestoreCollection(user?.uid, 'recurringTransactions')
  const { data: transactions, add: addTransaction } = useFirestoreCollection(user?.uid, 'transactions', 10000)
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const sanitizeAmount = (val) => {
    const n = Number(val)
    return { valid: !Number.isNaN(n) && isFinite(n) && n > 0, value: n }
  }

  const saveRecurring = async () => {
    if (!description.trim() || !amount || !dayOfMonth) return toast.warning('Please complete the form')
    const { valid, value: amt } = sanitizeAmount(amount)
    if (!valid) return toast.warning('Enter a valid amount')
    if (type === 'expense' && !category) return toast.warning('Select a category for expenses')

    try {
      await add({
        description: description.trim(),
        amount: amt,
        type,
        category: type === 'expense' ? category : '',
        dayOfMonth: Math.min(Math.max(Number(dayOfMonth), 1), 28),
      })
      setDescription('')
      setAmount('')
      setCategory('')
      setDayOfMonth('1')
      toast.success('Recurring transaction added')
    } catch (err) {
      console.error('Failed to add recurring transaction:', err)
      toast.error('Failed to add recurring transaction')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    saveRecurring()
  }

  const handleApply = async () => {
    if (recurring.length === 0) return toast.warning('No recurring transactions to apply')
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
      toast.warning(`Applied ${count} transactions, ${errors} failed`)
    } else if (count > 0) {
      toast.success(`Applied ${count} recurring transaction(s)`)
    } else {
      toast.info('Recurring transactions already exist for this month')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Recurring transaction deleted')
    } catch {
      toast.error('Failed to delete recurring transaction')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center sm:items-start">
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
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Automation</p>
        <h2 className="text-2xl font-bold tracking-tight">Recurring</h2>
        <p className="mt-1 text-sm text-muted-foreground">Set up monthly recurring entries and apply them.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Recurring Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="recurring-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  type="text"
                  placeholder="e.g., Salary, Rent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <ToggleGroup
                  type="single"
                  value={type}
                  onValueChange={(val) => {
                    if (val) {
                      setType(val)
                      if (val === 'income') setCategory('')
                    }
                  }}
                  className="w-full"
                >
                  <ToggleGroupItem value="expense" className="flex-1 data-pressed:border-expense data-pressed:bg-expense/10 data-pressed:text-expense">
                    <ArrowDownLeft className="h-4 w-4" /> Expense
                  </ToggleGroupItem>
                  <ToggleGroupItem value="income" className="flex-1 data-pressed:border-income data-pressed:bg-income/10 data-pressed:text-income">
                    <ArrowUpRight className="h-4 w-4" /> Income
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Category
                  {type !== 'expense' && <span className="ml-2 inline-flex items-center rounded-full border border-muted-foreground/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">expenses only</span>}
                </label>
                <Select value={category} onValueChange={setCategory} disabled={type !== 'expense'}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Day of Month</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="1-28"
                  min="1"
                  max="28"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" disabled={false} onClick={saveRecurring} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add Recurring Transaction
          </Button>
          {recurring.length > 0 && (
            <Button variant="outline" onClick={handleApply} className="w-full sm:w-auto">
              <Play className="h-4 w-4" /> Apply for Current Month
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Recurring</CardTitle>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Play className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No recurring transactions yet</p>
            </div>
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
                        className="min-touch text-destructive"
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
