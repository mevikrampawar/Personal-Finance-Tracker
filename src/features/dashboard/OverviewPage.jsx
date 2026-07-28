import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { getTransactionsForMonth, getTransactionDate } from '@/lib/date'
import { ChevronLeft, ChevronRight, Plus, TrendingDown, TrendingUp, IndianRupee, List, ArrowRight } from 'lucide-react'
import { subMonths, addMonths } from 'date-fns'
import { MonthPicker } from '@/components/ui/month-picker'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const spendPct = income > 0 ? Math.min((expenses / income) * 100, 100) : 0

  const recentTransactions = useMemo(() => {
    return [...monthTransactions]
      .sort((a, b) => {
        const da = getTransactionDate(a)
        const db = getTransactionDate(b)
        return (db?.getTime() || 0) - (da?.getTime() || 0)
      })
      .slice(0, 5)
  }, [monthTransactions])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dashboard</p>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="min-touch" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <MonthPicker value={month} onChange={setMonth} />
          <Button variant="outline" size="icon" className="min-touch" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <div className="flex items-baseline gap-1 text-3xl font-bold tabular-nums tracking-tight">
            <IndianRupee className="h-7 w-7 text-muted-foreground" />
            <span className={cn(balance < 0 && 'text-expense')}>
              {formatCurrency(balance)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Current Balance</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-income">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatCurrency(income)}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="flex items-center gap-1 text-expense">
              <TrendingDown className="h-3.5 w-3.5" />
              {formatCurrency(expenses)}
            </span>
          </div>
          {income > 0 && (
            <div className="mt-4 w-full max-w-xs">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Income vs Expenses</span>
                <span>{Math.round(spendPct)}% spent</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    spendPct > 100 ? 'bg-destructive' : spendPct > 80 ? 'bg-amber-500' : 'bg-income'
                  )}
                  style={{ width: `${Math.min(spendPct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card
          className="cursor-pointer transition-colors hoverable:hover:bg-muted/50 active:scale-[0.97]"
          onClick={() => navigate('/app/transactions')}
        >
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <TrendingUp className="h-5 w-5 text-income" />
            <span className="text-xs text-muted-foreground">Income</span>
            <span className="text-base font-bold tabular-nums text-income">{formatCurrency(income)}</span>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hoverable:hover:bg-muted/50 active:scale-[0.97]"
          onClick={() => navigate('/app/transactions')}
        >
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <TrendingDown className="h-5 w-5 text-expense" />
            <span className="text-xs text-muted-foreground">Expenses</span>
            <span className="text-base font-bold tabular-nums text-expense">{formatCurrency(expenses)}</span>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-colors hoverable:hover:bg-muted/50 active:scale-[0.97]"
          onClick={() => navigate('/app/transactions')}
        >
          <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
            <List className="h-5 w-5 text-balance" />
            <span className="text-xs text-muted-foreground">Transactions</span>
            <span className="text-base font-bold tabular-nums">{monthTransactions.length}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentTransactions.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No transactions this month</p>
          ) : (
            recentTransactions.map((t, i) => (
              <div
                key={t.id || i}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hoverable:hover:bg-muted/50 active:scale-[0.97]"
                onClick={() => navigate(`/app/add?edit=${t.id}`)}
              >
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', t.type === 'income' ? 'bg-income' : 'bg-expense')} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm">{t.description || t.category || 'Transaction'}</span>
                  {t.category && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">{t.category}</Badge>
                  )}
                </div>
                <span className={cn('shrink-0 text-sm font-medium tabular-nums', t.type === 'income' ? 'text-income' : 'text-expense')}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))
          )}
          {recentTransactions.length > 0 && (
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => navigate('/app/transactions')}>
              View All <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdown categories={categories} monthTransactions={monthTransactions} onCategoryClick={() => navigate('/app/transactions')} />
        <BudgetProgress categories={categories} monthTransactions={monthTransactions} onCategoryClick={() => navigate('/app/transactions')} />
      </div>

      <SpendingInsights transactions={transactions} month={month} monthTransactions={monthTransactions} />

      <div className="hidden lg:flex lg:flex-wrap lg:gap-3">
        <Button onClick={() => navigate('/app/add')}>
          <Plus data-icon="inline-start" /> Add Entry
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/compare')}>
          Compare
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/categories')}>
          Budgets
        </Button>
      </div>
    </div>
  )
}

export default OverviewPage
