import { formatCurrency } from '@/lib/currency'

export default function CategoryBreakdown({ transactions }) {
  const expenses = transactions.filter((t) => t.type === 'expense')
  const totals = {}
  expenses.forEach((t) => {
    const cat = t.category || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + (t.amount || 0)
  })
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)

  const colors = ['bg-primary', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">Expense Breakdown</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses for this month</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([cat, amount], i) => (
            <div key={cat}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{cat}</span>
                <span className="tabular-nums font-medium">{formatCurrency(amount)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                  style={{ width: `${Math.min((amount / total) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
