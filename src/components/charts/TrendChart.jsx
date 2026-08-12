import { useMemo } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { subMonths, format } from 'date-fns'
import { formatCurrency, formatCompactCurrency } from '@/lib/currency'
import { getTransactionsForMonth } from '@/lib/date'
import { INCOME_COLOR, EXPENSE_COLOR, tooltipStyle, tickStyle, gridStroke } from './chart-theme'

export function TrendChart({ transactions, endMonth, months = 6, height = 280 }) {
  const data = useMemo(() => {
    const out = []
    for (let i = months - 1; i >= 0; i--) {
      const m = subMonths(endMonth, i)
      const txs = getTransactionsForMonth(transactions, m)
      let income = 0
      let expenses = 0
      for (const t of txs) {
        if (t.type === 'income') income += t.amount || 0
        else expenses += t.amount || 0
      }
      out.push({ label: format(m, 'MMM yy'), income, expenses, net: income - expenses })
    }
    return out
  }, [transactions, endMonth, months])

  const hasData = data.some((d) => d.income > 0 || d.expenses > 0 || d.net !== 0)
  if (!hasData) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No transaction history for this period.</p>
  }

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tickStyle} />
          <YAxis
            width={54}
            tickLine={false}
            axisLine={false}
            tick={tickStyle}
            tickFormatter={(v) => formatCompactCurrency(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 4 }}
            itemStyle={{ color: 'var(--popover-foreground)' }}
            formatter={(value, name) => [formatCurrency(value), name]}
          />
          <Legend
            formatter={(value) => <span style={{ color: 'var(--popover-foreground)', fontSize: 12 }}>{value}</span>}
          />
          <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} />
          <Line dataKey="net" name="Net" type="monotone" stroke="var(--primary)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
