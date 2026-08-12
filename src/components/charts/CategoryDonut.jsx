import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { formatCurrency, formatCompactCurrency } from '@/lib/currency'
import { CHART_COLORS, tooltipStyle } from './chart-theme'

export function CategoryDonut({ categories, height = 220 }) {
  if (!categories.length) return null

  const total = categories.reduce((s, c) => s + c.amount, 0)
  if (total <= 0) return null

  return (
    <div className="relative w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categories}
            dataKey="amount"
            nameKey="category"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {categories.map((c, i) => (
              <Cell key={c.category} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'var(--muted-foreground)' }}
            itemStyle={{ color: 'var(--popover-foreground)' }}
            formatter={(value, name) => [formatCurrency(value), name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{formatCompactCurrency(total)}</span>
        <span className="text-xs text-muted-foreground">Total spent</span>
      </div>
    </div>
  )
}
