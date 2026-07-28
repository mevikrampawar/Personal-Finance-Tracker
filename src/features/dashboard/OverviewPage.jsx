import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatMonthYear, getTransactionsForMonth } from '@/lib/date'
import { useState, useMemo } from 'react'
import { addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, ArrowDownLeft, ArrowUpRight, IndianRupee, TrendingDown, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CategoryBreakdown from './CategoryBreakdown'
import BudgetProgress from './BudgetProgress'
import SpendingInsights from './SpendingInsights'

export default function OverviewPage() {
  const { user } = useAuth()
  const { data: transactions, loading } = useFirestoreCollection(user?.uid, 'transactions')
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const [month, setMonth] = useState(new Date())
  const navigate = useNavigate()

  const monthTransactions = useMemo(() => getTransactionsForMonth(transactions, month), [transactions, month])
  const income = useMemo(() => monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0), [monthTransactions])
  const expenses = useMemo(() => monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0), [monthTransactions])
  const balance = income - expenses

  const categoryBudgets = useMemo(() => {
    const budgets = {}
    categories.forEach((c) => {
      if (c.monthlyBudget > 0) budgets[c.name] = c.monthlyBudget
    })
    return budgets
  }, [categories])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Dashboard</p>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-lg border p-2 hover:bg-accent transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium">{formatMonthYear(month)}</span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-lg border p-2 hover:bg-accent transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Income" value={income} icon={TrendingUp} color="text-income" />
        <SummaryCard label="Total Expenses" value={expenses} icon={TrendingDown} color="text-expense" />
        <SummaryCard label="Balance" value={balance} icon={IndianRupee} color={balance >= 0 ? 'text-income' : 'text-expense'} />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction label="Add Entry" desc="Record money movement" onClick={() => navigate('/app/add')} icon="+" />
        <QuickAction label="Review" desc="Filter and export" onClick={() => navigate('/app/transactions')} icon="▦" />
        <QuickAction label="Budgets" desc="Tune category limits" onClick={() => navigate('/app/categories')} icon="◫" />
      </div>

      {/* Insights */}
      <SpendingInsights transactions={transactions} month={month} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdown transactions={monthTransactions} />
        <BudgetProgress transactions={monthTransactions} budgets={categoryBudgets} />
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{formatCurrency(value)}</p>
    </div>
  )
}

function QuickAction({ label, desc, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg text-primary font-bold">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  )
}
