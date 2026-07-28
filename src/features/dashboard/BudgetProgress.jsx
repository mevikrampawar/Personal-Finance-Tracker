import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/currency'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export function BudgetProgress({ categories, monthTransactions, onCategoryClick }) {
  const navigate = useNavigate()
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
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">No budgets set yet.</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/categories')}>
              Set Budgets
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {budgetEntries.map((c) => {
              const spent = totals[c.name] || 0
              const pct = Math.min((spent / c.monthlyBudget) * 100, 100)
              const over = spent > c.monthlyBudget

              const barClass = over
                ? '[&_[data-slot=progress-indicator]]:bg-destructive'
                : pct > 80
                  ? '[&_[data-slot=progress-indicator]]:bg-orange-500'
                  : pct > 50
                    ? '[&_[data-slot=progress-indicator]]:bg-amber-500'
                    : '[&_[data-slot=progress-indicator]]:bg-income'

              return (
                <div
                  key={c.name}
                  className="cursor-pointer transition-colors active:scale-[0.97]"
                  onClick={() => onCategoryClick?.(c.name)}
                >
                  <Progress value={pct} className={barClass}>
                    <ProgressLabel>{c.name}</ProgressLabel>
                    <ProgressValue>
                      {formatCurrency(spent)} / {formatCurrency(c.monthlyBudget)}
                    </ProgressValue>
                  </Progress>
                  <div className="mt-1 flex justify-between">
                    {over && <span className="text-xs text-destructive">Over budget</span>}
                    <span className={cn('ml-auto text-xs', over ? 'text-destructive' : 'text-muted-foreground')}>
                      {Math.round((spent / c.monthlyBudget) * 100)}% used
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BudgetProgress
