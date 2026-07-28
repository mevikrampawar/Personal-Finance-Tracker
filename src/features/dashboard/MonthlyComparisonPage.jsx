import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatMonthYear, getTransactionsForMonth } from '@/lib/date'
import { addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react'

export default function MonthlyComparisonPage() {
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

  // Merge all categories from both months
  const allCategories = [...new Set([
    ...Object.keys(stats.left.categories),
    ...Object.keys(stats.right.categories),
  ])].sort()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Analytics</p>
        <h2 className="text-2xl font-bold tracking-tight">Monthly Comparison</h2>
        <p className="mt-1 text-sm text-muted-foreground">Compare two months side by side.</p>
      </div>

      {/* Month Pickers */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: 'Left Month', month: leftMonth, setMonth: setLeftMonth },
          { label: 'Right Month', month: rightMonth, setMonth: setRightMonth },
        ].map(({ label, month, setMonth }) => (
          <div key={label} className="flex items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
            <button onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded-lg p-1.5 hover:bg-accent transition-colors" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-sm font-medium">{formatMonthYear(month)}</span>
            <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-lg p-1.5 hover:bg-accent transition-colors" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Summary Comparison */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 border-b bg-muted/50">
          <div className="px-4 py-3 text-sm font-medium text-muted-foreground">Metric</div>
          <div className="px-4 py-3 text-center text-sm font-medium">{formatMonthYear(leftMonth)}</div>
          <div className="px-4 py-3 text-center text-sm font-medium">{formatMonthYear(rightMonth)}</div>
        </div>
        {[
          { label: 'Transactions', left: stats.left.count, right: stats.right.count },
          { label: 'Income', left: stats.left.income, right: stats.right.income },
          { label: 'Expenses', left: stats.left.expenses, right: stats.right.expenses },
          { label: 'Balance', left: stats.left.balance, right: stats.right.balance },
        ].map(({ label, left, right }) => (
          <div key={label} className="grid grid-cols-3 border-b last:border-0">
            <div className="px-4 py-3 text-sm font-medium">{label}</div>
            <div className="px-4 py-3 text-center text-sm tabular-nums">
              {label === 'Transactions' ? left : formatCurrency(left)}
            </div>
            <div className="px-4 py-3 text-center text-sm tabular-nums">
              {label === 'Transactions' ? right : formatCurrency(right)}
              <span className="ml-2"><ChangeIndicator prev={left} curr={right} /></span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Comparison */}
      {allCategories.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Category Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Left</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Right</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change</th>
                </tr>
              </thead>
              <tbody>
                {allCategories.map((cat) => {
                  const left = stats.left.categories[cat] || 0
                  const right = stats.right.categories[cat] || 0
                  return (
                    <tr key={cat} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
        </div>
      )}
    </div>
  )
}
