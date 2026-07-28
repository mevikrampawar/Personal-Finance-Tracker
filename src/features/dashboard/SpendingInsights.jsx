import { useMemo } from 'react'
import { getTransactionsForMonth } from '@/lib/date'
import { formatCurrency } from '@/lib/currency'
import { subMonths } from 'date-fns'
import { AlertTriangle, TrendingDown, TrendingUp, Lightbulb } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function SpendingInsights({ transactions, month, monthTransactions }) {
  const insights = useMemo(() => {
    if (!transactions.length) return []

    const prevMonth = getTransactionsForMonth(transactions, subMonths(month, 1))

    const currentExpenses = monthTransactions.filter((t) => t.type === 'expense')
    const prevExpenses = prevMonth.filter((t) => t.type === 'expense')
    const currentIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
    const currentTotalExpenses = currentExpenses.reduce((s, t) => s + (t.amount || 0), 0)
    const prevTotalExpenses = prevExpenses.reduce((s, t) => s + (t.amount || 0), 0)

    const result = []

    if (prevTotalExpenses > 0 && currentTotalExpenses > 0) {
      const change = ((currentTotalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100
      if (Math.abs(change) > 10) {
        result.push({
          type: change > 0 ? 'warning' : 'success',
          icon: change > 0 ? AlertTriangle : TrendingDown,
          text: `You spent ${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'less'} this month vs last month.`,
        })
      }
    }

    const currentCatTotals = {}
    currentExpenses.forEach((t) => {
      const cat = t.category || 'Uncategorized'
      currentCatTotals[cat] = (currentCatTotals[cat] || 0) + (t.amount || 0)
    })
    const prevCatTotals = {}
    prevExpenses.forEach((t) => {
      const cat = t.category || 'Uncategorized'
      prevCatTotals[cat] = (prevCatTotals[cat] || 0) + (t.amount || 0)
    })

    Object.entries(currentCatTotals).forEach(([cat, amount]) => {
      const prev = prevCatTotals[cat] || 0
      if (prev > 0) {
        const pctChange = ((amount - prev) / prev) * 100
        if (pctChange > 25) {
          result.push({
            type: 'warning',
            icon: TrendingUp,
            text: `${cat} spending is up ${pctChange.toFixed(0)}% from last month (${formatCurrency(amount)} vs ${formatCurrency(prev)}).`,
          })
        }
      }
    })

    if (currentIncome > 0) {
      const savings = currentIncome - currentTotalExpenses
      const savingsRate = (savings / currentIncome) * 100
      if (savingsRate < 0) {
        result.push({
          type: 'warning',
          icon: AlertTriangle,
          text: `You're spending more than you earn this month. Consider reducing expenses.`,
        })
      } else if (savingsRate > 20) {
        result.push({
          type: 'success',
          icon: TrendingDown,
          text: `Great job! You're saving ${savingsRate.toFixed(0)}% of your income this month.`,
        })
      }
    }

    const topCategory = Object.entries(currentCatTotals).sort((a, b) => b[1] - a[1])[0]
    if (topCategory && currentTotalExpenses > 0) {
      const pct = (topCategory[1] / currentTotalExpenses) * 100
      if (pct > 40) {
        result.push({
          type: 'info',
          icon: Lightbulb,
          text: `${topCategory[0]} accounts for ${pct.toFixed(0)}% of your total spending.`,
        })
      }
    }

    return result.slice(0, 4)
  }, [transactions, month, monthTransactions])

  if (insights.length === 0) return null

  const badgeVariant = (type) => {
    switch (type) {
      case 'warning': return 'destructive'
      case 'success': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Spending Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const Icon = insight.icon
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
                <Badge variant={badgeVariant(insight.type)} className="mt-0.5 shrink-0">
                  <Icon />
                </Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">{insight.text}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default SpendingInsights
