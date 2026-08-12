import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { getTransactionsForMonth, getTransactionDate, formatShortDate, formatYearMonth } from '@/lib/date'
import { exportToCSV } from '@/lib/csv'
import { ChevronLeft, ChevronRight, Search, Download, X, Edit, Trash2, TrendingUp, TrendingDown, SlidersHorizontal, Check, CheckSquare, Tag } from 'lucide-react'
import { subMonths, addMonths } from 'date-fns'
import { MonthPicker } from '@/components/ui/month-picker'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export default function TransactionsPage() {
  const { user } = useAuth()
  const { data: transactions, loading, remove, update } = useFirestoreCollection(user?.uid, 'transactions', 10000)
  const { data: categories } = useFirestoreCollection(user?.uid, 'categories')
  const [month, setMonth] = useState(new Date())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const navigate = useNavigate()

  const monthTransactions = useMemo(() => getTransactionsForMonth(transactions, month), [transactions, month])
  const filtered = useMemo(() => monthTransactions.filter((t) => {
    const desc = (t.description || '').toLowerCase()
    const cat = (t.category || '').toLowerCase()
    const s = search.toLowerCase()
    if (s && !desc.includes(s) && !cat.includes(s)) return false
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    const amt = Number(t.amount || 0)
    if (minAmount && amt < Number(minAmount)) return false
    if (maxAmount && amt > Number(maxAmount)) return false
    const d = getTransactionDate(t)
    if (fromDate && d && d < new Date(`${fromDate}T00:00:00`)) return false
    if (toDate && d && d > new Date(`${toDate}T23:59:59`)) return false
    return true
  }), [monthTransactions, search, typeFilter, categoryFilter, minAmount, maxAmount, fromDate, toDate])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const da = getTransactionDate(a)
    const db = getTransactionDate(b)
    return (db?.getTime() || 0) - (da?.getTime() || 0)
  }), [filtered])

  const categoryNames = useMemo(() => [...new Set(monthTransactions.map((t) => t.category).filter(Boolean))], [monthTransactions])

  const handleExport = () => {
    exportToCSV(sorted, `finance-transactions-${formatYearMonth(month)}.csv`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget)
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete transaction')
    } finally {
      setDeleteTarget(null)
    }
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

  const toggleSelectMode = () => {
    setSelectMode((m) => !m)
    setSelectedIds(new Set())
    setBulkCategory('')
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => setSelectedIds(new Set(sorted.map((t) => t.id)))

  const clearSelection = () => setSelectedIds(new Set())

  const applyBulkCategory = async () => {
    const cat = bulkCategory
    if (!cat) return toast.warning('Choose a category to apply')
    if (selectedIds.size === 0) return toast.warning('Select at least one transaction')
    let ok = 0
    for (const id of selectedIds) {
      try {
        await update(id, { category: cat })
        ok++
      } catch {
        toast.error('Failed to update a transaction')
      }
    }
    if (ok > 0) toast.success(`Categorized ${ok} transaction${ok !== 1 ? 's' : ''}`)
    setSelectedIds(new Set())
    setBulkCategory('')
  }

  const hasFilters = search || typeFilter !== 'all' || categoryFilter !== 'all' || minAmount || maxAmount || fromDate || toDate

  const activeFilterCount = [search, typeFilter !== 'all' ? 1 : '', categoryFilter !== 'all' ? 1 : '', minAmount, maxAmount, fromDate, toDate].filter(Boolean).length

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with month nav */}
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Ledger</p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Transactions</h2>
        </div>
        <div className="flex items-center gap-0">
          <Button variant="ghost" size="icon" className="min-touch" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <MonthPicker value={month} onChange={setMonth} />
          <Button variant="ghost" size="icon" className="min-touch" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search + filter toggle (mobile) / full filters (desktop) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="min-touch sm:hidden relative"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
          <Download className="h-3 w-3" /> Export
        </Button>
        <Button variant={selectMode ? 'default' : 'outline'} size="sm" onClick={toggleSelectMode}>
          <CheckSquare className="h-3 w-3" /> {selectMode ? 'Done' : 'Select'}
        </Button>
      </div>

      {/* Bulk category bar */}
      {selectMode && (
        <div className="flex flex-col gap-2 rounded-xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium tabular-nums">{selectedIds.size} selected</span>
            <Button variant="ghost" size="sm" onClick={selectAllVisible}>Select all</Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedIds.size === 0}>Clear</Button>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select value={bulkCategory} onValueChange={setBulkCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={applyBulkCategory} disabled={selectedIds.size === 0}>Apply</Button>
          </div>
        </div>
      )}

      {/* Filters - collapsible on mobile, always visible on desktop */}
      <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryNames.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Min ₹"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="h-10"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Max ₹"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex gap-2">
                <DatePicker value={fromDate} onChange={setFromDate} placeholder="From date" />
                <DatePicker value={toDate} onChange={setToDate} placeholder="To date" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport} className="sm:hidden ml-auto">
                <Download className="h-3 w-3" /> Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction count */}
      <p className="text-xs text-muted-foreground">
        {sorted.length} transaction{sorted.length !== 1 ? 's' : ''}
        {hasFilters && ' filtered'}
      </p>

      {/* Mobile card list */}
      <div className="space-y-2 sm:hidden">
        {sorted.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No transactions found
            </CardContent>
          </Card>
        ) : (
          sorted.map((t) => {
            const d = getTransactionDate(t)
            return (
              <Card key={t.id} className="overflow-hidden active:bg-muted/20 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {selectMode && (
                        <Button variant="outline" size="icon" className="min-touch mr-1 shrink-0" onClick={() => toggleSelect(t.id)} aria-label={selectedIds.has(t.id) ? 'Deselect' : 'Select'}>
                          {selectedIds.has(t.id) ? <Check className="h-4 w-4" /> : null}
                        </Button>
                      )}
                      <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${t.type === 'income' ? 'bg-income/10' : 'bg-expense/10'}`}>
                        {t.type === 'income' ? <TrendingUp className="h-4 w-4 text-income" /> : <TrendingDown className="h-4 w-4 text-expense" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{d ? formatShortDate(d) : '-'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-sm tabular-nums font-semibold ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(t.amount || 0)}
                      </p>
                      <Badge variant={t.type === 'income' ? 'secondary' : 'destructive'} className="mt-0.5 text-[10px] h-4 px-1.5">
                        {t.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <div>
                      {t.category ? (
                        <Badge variant="outline" className="text-[10px] h-5">{t.category}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No category</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="min-touch" onClick={() => navigate(`/app/add?edit=${t.id}`)} aria-label="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="min-touch text-destructive" onClick={() => setDeleteTarget(t.id)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {selectMode && <TableHead className="w-12">✓</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectMode ? 7 : 6} className="py-12 text-center text-muted-foreground">No transactions found</TableCell>
              </TableRow>
            ) : (
              sorted.map((t) => {
                const d = getTransactionDate(t)
                return (
                  <TableRow key={t.id}>
                    {selectMode && (
                      <TableCell>
                        <Button variant="outline" size="icon" className="min-touch h-9 w-9" onClick={() => toggleSelect(t.id)} aria-label={selectedIds.has(t.id) ? 'Deselect' : 'Select'}>
                          {selectedIds.has(t.id) ? <Check className="h-4 w-4" /> : null}
                        </Button>
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap text-muted-foreground">{d ? formatShortDate(d) : '-'}</TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'income' ? 'secondary' : 'destructive'} className="gap-1">
                        {t.type === 'income' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.category ? <Badge variant="outline">{t.category}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {formatCurrency(t.amount || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="min-touch" onClick={() => navigate(`/app/add?edit=${t.id}`)} aria-label="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="min-touch text-destructive" onClick={() => setDeleteTarget(t.id)} aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
