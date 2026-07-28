import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatMonthYear, getTransactionsForMonth } from '@/lib/date'
import { addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, TrendingDown, TrendingUp, IndianRupee } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryBreakdown } from './CategoryBreakdown'
import { BudgetProgress } from './BudgetProgress'
import { SpendingInsights } from './SpendingInsights'

export function OverviewPage() {
  const { user } = useAuth()
  const { data: transactions, loading } = useFirestoreCollection(user?.uid, 'transactions')
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const [month, setMonth] = useState(new Date())
  const navigate = useNavigate()

  const monthTransactions = useMemo(() => getTransactionsForMonth(transactions, month), [transactions, month])
  const income = useMemo(() => monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0), [monthTransactions])
  const expenses = useMemo(() => monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0), [monthTransactions])
  const balance = income - expenses

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Dashboard</p>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">{formatMonthYear(month)}</span>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(new Date())}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="flex items-center gap-2 text-2xl font-bold tabular-nums">
              <TrendingUp className="h-5 w-5 text-income" />
              {formatCurrency(income)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="flex items-center gap-2 text-2xl font-bold tabular-nums text-expense">
              <TrendingDown className="h-5 w-5" />
              {formatCurrency(expenses)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`flex items-center gap-2 text-2xl font-bold tabular-nums ${balance >= 0 ? '' : 'text-expense'}`}>
              <IndianRupee className="h-5 w-5" />
              {formatCurrency(balance)}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/app/add')}>
          <Plus data-icon="inline-start" /> Add Entry
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/transactions')}>
          Review
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/compare')}>
          Compare
        </Button>
      </div>

      <SpendingInsights transactions={transactions} month={month} monthTransactions={monthTransactions} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdown categories={categories} monthTransactions={monthTransactions} />
        <BudgetProgress categories={categories} monthTransactions={monthTransactions} />
      </div>
    </div>
  )
}

export default OverviewPage
