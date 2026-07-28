import { formatCurrency } from '@/lib/currency'

export default function BudgetProgress({ transactions, budgets }) {
  const expenses = transactions.filter((t) => t.type === 'expense')
  const totals = {}
  expenses.forEach((t) => {
    const cat = t.category || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + (t.amount || 0)
  })

  const budgetEntries = Object.entries(budgets).filter(([, b]) => b > 0)

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">Budget Progress</h3>
      {budgetEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budgets set</p>
      ) : (
        <div className="space-y-3">
          {budgetEntries.map(([cat, budget]) => {
            const spent = totals[cat] || 0
            const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
            const over = spent > budget
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{cat}</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(spent)} / {formatCurrency(budget)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
