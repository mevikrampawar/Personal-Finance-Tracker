import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { getTransactionsForMonth, toLocalDate, formatShortDate, formatYearMonth, formatInputDate } from '@/lib/date'
import { exportToCSV } from '@/lib/csv'
import { useConfirmCtx } from '@/app/providers'
import { addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Search, Download, X, Edit, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TransactionsPage() {
  const { user } = useAuth()
  const { data: transactions, loading, remove } = useFirestoreCollection(user?.uid, 'transactions')
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const { confirm } = useConfirmCtx()
  const [month, setMonth] = useState(new Date())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const navigate = useNavigate()

  const monthTransactions = getTransactionsForMonth(transactions, month)
  const filtered = monthTransactions.filter((t) => {
    const desc = (t.description || '').toLowerCase()
    const cat = (t.category || '').toLowerCase()
    const s = search.toLowerCase()
    if (s && !desc.includes(s) && !cat.includes(s)) return false
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    const amt = Number(t.amount || 0)
    if (minAmount && amt < Number(minAmount)) return false
    if (maxAmount && amt > Number(maxAmount)) return false
    const d = toLocalDate(t.createdAt)
    if (fromDate && d && d < new Date(`${fromDate}T00:00:00`)) return false
    if (toDate && d && d > new Date(`${toDate}T23:59:59`)) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const da = toLocalDate(a.createdAt)
    const db = toLocalDate(b.createdAt)
    return (db?.getTime() || 0) - (da?.getTime() || 0)
  })

  const categoryNames = [...new Set(monthTransactions.map((t) => t.category).filter(Boolean))]

  const handleExport = () => {
    exportToCSV(sorted, `finance-transactions-${formatYearMonth(month)}.csv`)
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this transaction? This action cannot be undone.')
    if (!ok) return
    await remove(id)
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setMinAmount('')
    setMaxAmount('')
    setFromDate('')
    setToDate('')
  }

  const hasFilters = search || typeFilter !== 'all' || categoryFilter !== 'all' || minAmount || maxAmount || fromDate || toDate

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Ledger</p>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded-lg border p-2 hover:bg-accent transition-colors" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium">{formatShortDate(month)}</span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-lg border p-2 hover:bg-accent transition-colors" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search description or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            {categoryNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors ml-auto">
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              ) : (
                sorted.map((t) => {
                  const d = toLocalDate(t.createdAt)
                  return (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{d ? formatShortDate(d) : '-'}</td>
                      <td className="px-4 py-3 font-medium">{t.description}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                        }`}>
                          {t.type === 'income' ? '📈' : '📉'} {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.category || '-'}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(t.amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/add?edit=${t.id}`)} className="rounded p-1.5 hover:bg-accent transition-colors" aria-label="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="rounded p-1.5 hover:bg-destructive/10 text-destructive transition-colors" aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
