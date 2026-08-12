import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { getTransactionsInRange, computeSummary, categoryTotals, topExpenses } from '@/lib/reporting'
import { getTransactionDate } from '@/lib/date'
import { exportCSVData } from '@/lib/csv'
import { subWeeks, addWeeks, subMonths, addMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Printer, TrendingUp, TrendingDown, Wallet, List, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { CashFlowChart } from '@/components/charts/CashFlowChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { CHART_COLORS } from '@/components/charts/chart-theme'
import { cn } from '@/lib/utils'

const weekStart = (d) => {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  x.setHours(0, 0, 0, 0, 0)
  return x
}

const DAY_MS = 24 * 60 * 60 * 1000

export default function ReportsPage() {
  const { user } = useAuth()
  const { data: transactions } = useFirestoreCollection(user?.uid, 'transactions', 10000)

  const [mode, setMode] = useState('monthly')
  const [base, setBase] = useState(() => startOfMonth(new Date()))

  const { start, end, label } = useMemo(() => {
    if (mode === 'weekly') {
      const start = weekStart(base)
      const end = new Date(start.getTime() + 6 * DAY_MS)
      end.setHours(23, 59, 59, 999)
      return {
        start,
        end,
        label: `Week of ${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
      }
    }
    const start = startOfMonth(base)
    const end = endOfMonth(base)
    end.setHours(23, 59, 59, 999)
    return { start, end, label: format(start, 'MMMM yyyy') }
  }, [mode, base])

  const rangeTransactions = useMemo(
    () => getTransactionsInRange(transactions, start, end),
    [transactions, start, end],
  )

  const summary = useMemo(() => computeSummary(rangeTransactions), [rangeTransactions])
  const categories = useMemo(() => categoryTotals(rangeTransactions), [rangeTransactions])
  const top = useMemo(() => topExpenses(rangeTransactions, 5), [rangeTransactions])

  const sorted = useMemo(
    () =>
      rangeTransactions.slice().sort((a, b) => {
        const da = getTransactionDate(a)?.getTime() || 0
        const db = getTransactionDate(b)?.getTime() || 0
        return db - da
      }),
    [rangeTransactions],
  )

  const handlePrev = () => {
    setBase((b) => (mode === 'weekly' ? subWeeks(b, 1) : subMonths(b, 1)))
  }
  const handleNext = () => {
    setBase((b) => (mode === 'weekly' ? addWeeks(b, 1) : addMonths(b, 1)))
  }

  const filename = `finance-report-${mode}-${format(start, 'yyyy-MM-dd')}.csv`

  const handleDownloadCSV = () => {
    const header = ['Date', 'Description', 'Category', 'Type', 'Amount']
    const rows = sorted.map((t) => {
      const d = getTransactionDate(t)
      return [
        d ? format(d, 'yyyy-MM-dd') : '',
        t.description || '',
        t.category || '',
        t.type || '',
        t.amount || 0,
      ]
    })
    exportCSVData(header, rows, filename)
  }

  const handlePrint = () => {
    window.print()
  }

  const dayLabel = (date) => format(date, 'EEE')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reports</p>
          <h2 className="text-2xl font-bold tracking-tight">Weekly & Monthly Reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">Generate a summary report and export it as CSV or PDF.</p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="outline" onClick={handleDownloadCSV} disabled={sorted.length === 0}>
            <Download data-icon="inline-start" /> CSV
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer data-icon="inline-start" /> Print / PDF
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v)}>
            <ToggleGroupItem value="weekly" className="min-w-24">Weekly</ToggleGroupItem>
            <ToggleGroupItem value="monthly" className="min-w-24">Monthly</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon" className="min-touch" onClick={handlePrev} aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-44 text-center text-sm font-medium">{label}</span>
            <Button variant="ghost" size="icon" className="min-touch" onClick={handleNext} aria-label="Next period">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div id="report-area" className="space-y-6">
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold tracking-tight">Finance Report</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {label} · Generated {format(new Date(), 'MMMM d, yyyy, h:mm a')}
          </p>
        </div>

        {sorted.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No transactions in this period.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                  <TrendingUp className="h-5 w-5 text-income" />
                  <span className="text-xs text-muted-foreground">Income</span>
                  <span className="text-base font-bold tabular-nums text-income">{formatCurrency(summary.income)}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                  <TrendingDown className="h-5 w-5 text-expense" />
                  <span className="text-xs text-muted-foreground">Expenses</span>
                  <span className="text-base font-bold tabular-nums text-expense">{formatCurrency(summary.expenses)}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                  <Wallet className={cn('h-5 w-5', summary.net >= 0 ? 'text-balance' : 'text-expense')} />
                  <span className="text-xs text-muted-foreground">Savings</span>
                  <span className={cn('text-base font-bold tabular-nums', summary.net >= 0 ? 'text-balance' : 'text-expense')}>
                    {formatCurrency(summary.net)}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                  <List className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">Transactions</span>
                  <span className="text-base font-bold tabular-nums">{summary.count}</span>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cash Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <CashFlowChart
                  transactions={rangeTransactions}
                  start={start}
                  end={end}
                  height={240}
                  dayLabel={mode === 'weekly' ? dayLabel : undefined}
                />
              </CardContent>
            </Card>

            {categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <CategoryDonut categories={categories} height={220} />
                    <div className="space-y-2">
                      {categories.map(({ category, amount }, i) => {
                        const pct = summary.expenses > 0 ? ((amount / summary.expenses) * 100).toFixed(0) : '0'
                        return (
                          <div key={category} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', 'bg-transparent')} style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="truncate">{category}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                              <span className="tabular-nums font-medium">{formatCurrency(amount)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {top.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Top Expenses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {top.map((t, i) => {
                    const d = getTransactionDate(t)
                    return (
                      <div key={t.id || i} className="flex items-center gap-3 rounded-lg px-2 py-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-expense/10 text-xs font-bold text-expense">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.description || t.category || 'Expense'}</p>
                          <p className="text-xs text-muted-foreground">
                            {d ? format(d, 'MMM d') : ''}
                            {t.category ? ` · ${t.category}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-expense">
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">All Transactions</CardTitle>
                <Badge variant="secondary">{sorted.length}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden overflow-x-auto sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((t, i) => {
                        const d = getTransactionDate(t)
                        return (
                          <TableRow key={t.id || i}>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {d ? format(d, 'MMM d, yyyy') : '—'}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="truncate font-medium" title={t.description}>{t.description}</p>
                            </TableCell>
                            <TableCell>{t.category || <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className={cn('text-right tabular-nums font-medium', t.type === 'income' ? 'text-income' : 'text-expense')}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y sm:hidden">
                  {sorted.map((t, i) => {
                    const d = getTransactionDate(t)
                    return (
                      <div key={t.id || i} className="flex items-center gap-3 px-4 py-3">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', t.type === 'income' ? 'bg-income' : 'bg-expense')} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {d ? format(d, 'MMM d, yyyy') : ''}
                            {t.category ? ` · ${t.category}` : ''}
                          </p>
                        </div>
                        <span className={cn('shrink-0 text-sm font-medium tabular-nums', t.type === 'income' ? 'text-income' : 'text-expense')}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
