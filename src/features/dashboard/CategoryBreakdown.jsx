import { formatCurrency } from '@/lib/currency'
import { categoryTotals } from '@/lib/reporting'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CategoryDonut } from '@/components/charts/CategoryDonut'

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-indigo-500',
]

export function CategoryBreakdown({ monthTransactions, onCategoryClick }) {
  const entries = categoryTotals(monthTransactions)
  const total = entries.reduce((s, e) => s + e.amount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses this month</p>
        ) : (
          <div className="space-y-4">
            <CategoryDonut categories={entries} height={220} />
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {entries.map(({ category, amount }, i) => (
                <div
                  key={category}
                  className={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  style={{ width: `${(amount / total) * 100}%` }}
                />
              ))}
            </div>
            <div className="space-y-2">
              {entries.map(({ category, amount }, i) => {
                const pct = ((amount / total) * 100).toFixed(0)
                return (
                  <div
                    key={category}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-1.5 text-sm transition-colors hoverable:hover:bg-muted/50 active:scale-[0.97]"
                    onClick={() => onCategoryClick?.(category)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`} />
                      <span className="truncate">{category}</span>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      <span className="tabular-nums font-medium">{formatCurrency(amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CategoryBreakdown
