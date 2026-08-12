import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { dailySeries } from '@/lib/reporting'
import { formatCurrency, formatCompactCurrency } from '@/lib/currency'
import { INCOME_COLOR, EXPENSE_COLOR, tooltipStyle, tickStyle, gridStroke } from './chart-theme'

export function CashFlowChart({ transactions, start, end, height = 240, dayLabel }) {
  const data = dailySeries(transactions, start, end)
  const hasData = data.some((d) => d.income > 0 || d.expense > 0)

  if (!hasData) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No income or expenses in this period.</p>
  }

  const tick = (day, index) => (dayLabel ? dayLabel(data[index]?.date, day) : String(day))

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={tickStyle} interval={dayLabel ? 0 : 4} />
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
            labelFormatter={(_, payload) => (payload?.[0]?.payload?.date ? (dayLabel ? dayLabel(payload[0].payload.date, payload[0].payload.day) : `Day ${payload[0].payload.day}`) : '')}
          />
          <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} />
          <Bar dataKey="expense" name="Expenses" fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
