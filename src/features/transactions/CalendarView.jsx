import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { getTransactionsForDate, getTransactionDate, formatFullDate } from '@/lib/date'
import { getDay, getDaysInMonth, isSameDay, isToday, subMonths, addMonths } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { MonthPicker } from '@/components/ui/month-picker'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView() {
  const { user } = useAuth()
  const { data: transactions, loading, remove } = useFirestoreCollection(user?.uid, 'transactions', 500)
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const navigate = useNavigate()

  const year = month.getFullYear()
  const monthIdx = month.getMonth()
  const firstDayOfMonth = new Date(year, monthIdx, 1)
  const daysInMonth = getDaysInMonth(firstDayOfMonth)
  const startDay = getDay(firstDayOfMonth)

  const calendarDays = useMemo(() => {
    const days = []
    const prevMonthDays = getDaysInMonth(new Date(year, monthIdx - 1))
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, monthIdx - 1, prevMonthDays - i) })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, currentMonth: true, date: new Date(year, monthIdx, d) })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, currentMonth: false, date: new Date(year, monthIdx + 1, d) })
    }
    return days
  }, [year, monthIdx, daysInMonth, startDay])

  const txCountByDate = useMemo(() => {
    const map = {}
    transactions.forEach((t) => {
      const d = getTransactionDate(t)
      if (!d) return
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = { income: 0, expense: 0 }
      if (t.type === 'income') map[key].income += 1
      else map[key].expense += 1
    })
    return map
  }, [transactions])

  const selectedDayTransactions = useMemo(
    () => getTransactionsForDate(transactions, selectedDate).sort((a, b) => {
      const da = getTransactionDate(a)
      const db = getTransactionDate(b)
      return (db?.getTime() || 0) - (da?.getTime() || 0)
    }),
    [transactions, selectedDate],
  )

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-2 h-12 w-full" />
            <Skeleton className="mt-2 h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calendar</p>
          <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
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

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const dateKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`
              const counts = txCountByDate[dateKey]
              const isSelected = isSameDay(day.date, selectedDate)
              const today = isToday(day.date)
              return (
                <Button
                  key={i}
                  variant="ghost"
                  onClick={() => setSelectedDate(day.date)}
                  className={`relative flex flex-col items-center rounded-lg py-2 text-sm transition-colors ${
                    !day.currentMonth ? 'text-muted-foreground/40' : 'text-foreground'
                  } ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : today ? 'bg-accent font-medium' : 'hoverable:hover:bg-muted/50'}`}
                >
                  {day.day}
                  {counts && (
                    <div className="mt-0.5 flex items-center gap-0.5">
                      {counts.income > 0 && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-income" />
                      )}
                      {counts.expense > 0 && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-expense" />
                      )}
                    </div>
                  )}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b flex flex-row items-center gap-2 space-y-0">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">{formatFullDate(selectedDate)}</CardTitle>
          <span className="ml-auto text-xs text-muted-foreground">{selectedDayTransactions.length} transaction{selectedDayTransactions.length !== 1 ? 's' : ''}</span>
        </CardHeader>
        <CardContent className="p-0">
          {selectedDayTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No transactions on this date</p>
            </div>
          ) : (
            <>
              {/* Mobile: card per transaction */}
              <div className="space-y-2 p-3 sm:hidden">
                {selectedDayTransactions.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.description}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant={t.type === 'income' ? 'secondary' : 'destructive'} className="gap-1 text-[10px]">
                              {t.type === 'income' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {t.type}
                            </Badge>
                            {t.category && (
                              <span className="text-xs text-muted-foreground">{t.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-1">
                          <span className={`text-sm tabular-nums font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                            {formatCurrency(t.amount || 0)}
                          </span>
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
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDayTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === 'income' ? 'secondary' : 'destructive'} className="gap-1 text-[10px]">
                            {t.type === 'income' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.category || '-'}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                          {formatCurrency(t.amount || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="min-touch" onClick={() => navigate(`/app/add?edit=${t.id}`)} aria-label="Edit">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="min-touch text-destructive" onClick={() => setDeleteTarget(t.id)} aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
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
