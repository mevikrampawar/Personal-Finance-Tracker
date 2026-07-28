import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatMonthYear, getTransactionsForMonth } from '@/lib/date'
import { addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function pctChange(prev, curr) {
  if (prev === 0 && curr === 0) return 0
  if (prev === 0) return 100
  return ((curr - prev) / prev) * 100
}

function ChangeIndicator({ prev, curr }) {
  const pct = pctChange(prev, curr)
  if (prev === 0 && curr === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    )
  }
  if (prev === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-income">
        <ArrowUp className="h-3 w-3" /> 100%
      </span>
    )
  }
  const isUp = pct > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isUp ? 'text-expense' : 'text-income'
      )}
    >
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function MiniBar({ left, right, colorClass = 'bg-primary' }) {
  const total = left + right
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-muted" />
  const leftPct = (left / total) * 100
  const rightPct = (right / total) * 100
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
      <div
        className={cn('h-full rounded-l-full opacity-60', colorClass)}
        style={{ width: `${leftPct}%` }}
      />
      <div
        className={cn('h-full rounded-r-full opacity-80', colorClass)}
        style={{ width: `${rightPct}%` }}
      />
    </div>
  )
}

function isSameMonth(a, b) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function MonthSelector({ value, onChange, label }) {
  const isCurrent = isSameMonth(value, new Date())
  return (
    <Card
      className={cn(
        'flex items-center gap-1 p-2 sm:gap-2 sm:p-3',
        isCurrent && 'ring-1 ring-income/20 bg-income/[0.02]'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="min-touch active:scale-[0.97]"
        onClick={() => onChange(subMonths(value, 1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 text-center">
        <p className="text-xs font-medium leading-tight sm:text-sm">{formatMonthYear(value)}</p>
        {isCurrent && (
          <p className="text-[10px] font-medium text-income/70 sm:text-xs">{label}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="min-touch active:scale-[0.97]"
        onClick={() => onChange(addMonths(value, 1))}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </Card>
  )
}

export function MonthlyComparisonPage() {
  const { user } = useAuth()
  const { data: transactions, loading } = useFirestoreCollection(user?.uid, 'transactions')
  const [leftMonth, setLeftMonth] = useState(subMonths(new Date(), 1))
  const [rightMonth, setRightMonth] = useState(new Date())

  if (loading) {
    return (
      <div className="space-y-5 sm:space-y-8">
        <div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-1 h-8 w-56" />
          <Skeleton className="mt-1 h-5 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl sm:h-40" />
          ))}
        </div>
        <div>
          <Skeleton className="mb-3 h-5 w-44 sm:mb-4" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    )
  }

  const leftTx = useMemo(() => getTransactionsForMonth(transactions, leftMonth), [transactions, leftMonth])
  const rightTx = useMemo(() => getTransactionsForMonth(transactions, rightMonth), [transactions, rightMonth])

  const stats = useMemo(() => {
    const calc = (txs) => {
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
      const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
      const categories = {}
      txs.filter((t) => t.type === 'expense').forEach((t) => {
        const cat = t.category || 'Uncategorized'
        categories[cat] = (categories[cat] || 0) + (t.amount || 0)
      })
      return { income, expenses, balance: income - expenses, categories }
    }
    return { left: calc(leftTx), right: calc(rightTx) }
  }, [leftTx, rightTx])

  const allCategories = [...new Set([
    ...Object.keys(stats.left.categories),
    ...Object.keys(stats.right.categories),
  ])].sort()

  const summaryItems = [
    {
      key: 'income',
      label: 'Income',
      gradient: 'from-income/10',
      barColor: 'bg-income',
      leftVal: stats.left.income,
      rightVal: stats.right.income,
    },
    {
      key: 'expenses',
      label: 'Expenses',
      gradient: 'from-expense/10',
      barColor: 'bg-expense',
      leftVal: stats.left.expenses,
      rightVal: stats.right.expenses,
    },
    {
      key: 'balance',
      label: 'Balance',
      gradient: stats.right.balance >= 0 ? 'from-income/10' : 'from-expense/10',
      barColor: stats.right.balance >= 0 ? 'bg-income' : 'bg-expense',
      leftVal: stats.left.balance,
      rightVal: stats.right.balance,
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Analytics
        </p>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Monthly Comparison</h2>
        <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">
          Compare two months side by side.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <MonthSelector value={leftMonth} onChange={setLeftMonth} label="Current" />
        <MonthSelector value={rightMonth} onChange={setRightMonth} label="Current" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {summaryItems.map(({ key, label, gradient, barColor, leftVal, rightVal }) => (
          <Card key={key} className={cn('bg-gradient-to-r to-transparent', gradient)}>
            <CardContent className="p-4 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal">
                {label}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-2 sm:mt-3 sm:flex-col sm:gap-1">
                <span className="text-sm tabular-nums text-muted-foreground sm:text-base">
                  {formatCurrency(leftVal)}
                </span>
                <span className="text-base font-bold tabular-nums sm:text-2xl">
                  {formatCurrency(rightVal)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-end sm:mt-2 sm:justify-start">
                <ChangeIndicator prev={leftVal} curr={rightVal} />
              </div>
              <div className="mt-2 sm:mt-3">
                <MiniBar left={leftVal} right={rightVal} colorClass={barColor} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allCategories.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold sm:mb-4 sm:text-base">
            Category Comparison
          </h3>

          <div className="space-y-2 sm:hidden">
            {allCategories.map((cat) => {
              const left = stats.left.categories[cat] || 0
              const right = stats.right.categories[cat] || 0
              return (
                <Card key={cat}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium leading-tight">{cat}</p>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(left)}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(right)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatMonthYear(leftMonth)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMonthYear(rightMonth)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1">
                        <MiniBar left={left} right={right} colorClass="bg-expense" />
                      </div>
                      <ChangeIndicator prev={left} curr={right} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      {formatMonthYear(leftMonth)}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      {formatMonthYear(rightMonth)}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allCategories.map((cat) => {
                    const left = stats.left.categories[cat] || 0
                    const right = stats.right.categories[cat] || 0
                    return (
                      <tr
                        key={cat}
                        className="border-b last:border-0 transition-colors hoverable:hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium">{cat}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(left)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(right)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChangeIndicator prev={left} curr={right} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {allCategories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Add some expenses to see category comparison.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MonthlyComparisonPage
