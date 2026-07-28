import { formatCurrency } from '@/lib/currency'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function CategoryBreakdown({ categories, monthTransactions }) {
  const expenses = monthTransactions.filter((t) => t.type === 'expense')
  const totals = {}
  expenses.forEach((t) => {
    const cat = t.category || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + (t.amount || 0)
  })
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)

  const colors = [
    'bg-primary',
    'bg-blue-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-pink-500',
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses for this month</p>
        ) : (
          <div className="space-y-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {entries.map(([cat, amount], i) => (
                <div
                  key={cat}
                  className={colors[i % colors.length]}
                  style={{ width: `${(amount / total) * 100}%` }}
                />
              ))}
            </div>
            <div className="space-y-2">
              {entries.map(([cat, amount], i) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[i % colors.length]}`} />
                    <span className="truncate">{cat}</span>
                  </div>
                  <span className="ml-4 shrink-0 tabular-nums font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CategoryBreakdown
