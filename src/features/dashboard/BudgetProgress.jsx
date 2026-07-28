import { formatCurrency } from '@/lib/currency'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

export function BudgetProgress({ categories, monthTransactions }) {
  const expenses = monthTransactions.filter((t) => t.type === 'expense')
  const totals = {}
  expenses.forEach((t) => {
    const cat = t.category || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + (t.amount || 0)
  })

  const budgetEntries = categories.filter((c) => c.monthlyBudget > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {budgetEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No budgets set</p>
        ) : (
          <div className="space-y-4">
            {budgetEntries.map((c) => {
              const spent = totals[c.name] || 0
              const pct = Math.min((spent / c.monthlyBudget) * 100, 100)
              const over = spent > c.monthlyBudget
              return (
                <Progress
                  key={c.name}
                  value={pct}
                  className={over ? '[&_[data-slot=progress-indicator]]:bg-destructive' : ''}
                >
                  <ProgressLabel>{c.name}</ProgressLabel>
                  <ProgressValue>{formatCurrency(spent)} / {formatCurrency(c.monthlyBudget)}</ProgressValue>
                </Progress>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BudgetProgress
