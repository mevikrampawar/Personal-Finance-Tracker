import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatInputDate } from '@/lib/date'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, Save, X } from 'lucide-react'

export default function TransactionFormPage() {
  const { user } = useAuth()
  const { data: transactions, add, update } = useFirestoreCollection(user?.uid, 'transactions')
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const [description, setDescription] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(formatInputDate(new Date()))
  const [submitting, setSubmitting] = useState(false)

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
    if (!description.trim()) return toast.warning('Please enter a description')
    if (type === 'expense' && !category) return toast.warning('Please select a category for expenses')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.warning('Please enter a valid amount')
    if (!date) return toast.warning('Please select a date')

    const [y, m, d] = date.split('-')
    const transactionDate = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0)

    const payload = {
      description: description.trim(),
      type,
      category: type === 'expense' ? category : '',
      amount: amt,
      createdAt: transactionDate,
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        await update(editId, payload)
        toast.success('Transaction updated')
      } else {
        await add(payload)
        toast.success('Transaction added')
      }
      navigate('/app/transactions')
    } catch {
      toast.error('Failed to save transaction. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Transaction</p>
        <h2 className="text-2xl font-bold tracking-tight">
          {isEditing ? 'Edit Transaction' : 'Add Transaction'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Capture income or spending with category and date.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <Input
                  id="description"
                  placeholder="e.g., Grocery, Salary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
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
            </div>

            {type === 'expense' && (
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">Amount</label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="tabular-nums"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-medium">Date</label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              <Save className="h-4 w-4" />
              {isEditing ? 'Update Transaction' : 'Add Transaction'}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={() => navigate('/app/transactions')}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
