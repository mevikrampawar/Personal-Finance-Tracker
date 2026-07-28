import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatMonthYear, getTransactionsForMonth } from '@/lib/date'
import { addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function MonthlyComparisonPage() {
  const { user } = useAuth()
  const { data: transactions } = useFirestoreCollection(user?.uid, 'transactions')
  const [leftMonth, setLeftMonth] = useState(subMonths(new Date(), 1))
  const [rightMonth, setRightMonth] = useState(new Date())

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
      return { income, expenses, balance: income - expenses, categories, count: txs.length }
    }
    return { left: calc(leftTx), right: calc(rightTx) }
  }, [leftTx, rightTx])

  const pctChange = (prev, curr) => {
    if (prev === 0 && curr === 0) return 0
    if (prev === 0) return 100
    return ((curr - prev) / prev) * 100
  }

  const ChangeIndicator = ({ prev, curr }) => {
    const pct = pctChange(prev, curr)
    if (Math.abs(pct) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pct > 0 ? 'text-expense' : 'text-income'}`}>
        {pct > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(pct).toFixed(0)}%
      </span>
    )
  }

  const allCategories = [...new Set([
    ...Object.keys(stats.left.categories),
    ...Object.keys(stats.right.categories),
  ])].sort()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Analytics</p>
        <h2 className="text-2xl font-bold tracking-tight">Monthly Comparison</h2>
        <p className="mt-1 text-sm text-muted-foreground">Compare two months side by side.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-2 p-3">
          <Button variant="outline" size="icon" className="min-touch" onClick={() => setLeftMonth((m) => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <span className="flex-1 text-center text-sm font-medium">{formatMonthYear(leftMonth)}</span>
          <Button variant="outline" size="icon" className="min-touch" onClick={() => setLeftMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight />
          </Button>
        </Card>
        <Card className="flex items-center gap-2 p-3">
          <Button variant="outline" size="icon" className="min-touch" onClick={() => setRightMonth((m) => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <span className="flex-1 text-center text-sm font-medium">{formatMonthYear(rightMonth)}</span>
          <Button variant="outline" size="icon" className="min-touch" onClick={() => setRightMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight />
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-income">{formatCurrency(stats.left.income)}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">vs</span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(stats.right.income)}</span>
              <ChangeIndicator prev={stats.left.income} curr={stats.right.income} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-expense">{formatCurrency(stats.left.expenses)}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">vs</span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(stats.right.expenses)}</span>
              <ChangeIndicator prev={stats.left.expenses} curr={stats.right.expenses} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${stats.left.balance >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(stats.left.balance)}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">vs</span>
              <span className={`text-lg font-semibold tabular-nums ${stats.right.balance >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(stats.right.balance)}</span>
              <ChangeIndicator prev={stats.left.balance} curr={stats.right.balance} />
            </div>
          </CardContent>
        </Card>
      </div>

      {allCategories.length > 0 && (
        <>
          {/* Mobile category comparison cards */}
          <div className="space-y-2 sm:hidden">
            {allCategories.map((cat) => {
              const left = stats.left.categories[cat] || 0
              const right = stats.right.categories[cat] || 0
              return (
                <Card key={cat}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">{cat}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">{formatMonthYear(leftMonth)}</p>
                        <p className="mt-0.5 tabular-nums font-medium">{formatCurrency(left)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{formatMonthYear(rightMonth)}</p>
                        <p className="mt-0.5 tabular-nums font-medium">{formatCurrency(right)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Change</p>
                        <p className="mt-0.5"><ChangeIndicator prev={left} curr={right} /></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop category comparison table */}
          <Card className="hidden sm:block">
            <CardHeader>
              <CardTitle>Category Comparison</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{formatMonthYear(leftMonth)}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{formatMonthYear(rightMonth)}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {allCategories.map((cat) => {
                    const left = stats.left.categories[cat] || 0
                    const right = stats.right.categories[cat] || 0
                    return (
                      <tr key={cat} className="border-b last:border-0 transition-colors hoverable:hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{cat}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(left)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(right)}</td>
                        <td className="px-4 py-3 text-right"><ChangeIndicator prev={left} curr={right} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default MonthlyComparisonPage
