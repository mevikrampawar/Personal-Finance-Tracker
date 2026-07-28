import { useState, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { getTransactionsForDate, toLocalDate, formatFullDate, formatShortDate, formatInputDate } from '@/lib/date'
import { useConfirmCtx, useToastCtx } from '@/app/providers'
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDaysInMonth, isSameDay, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView() {
  const { user } = useAuth()
  const { data: transactions, remove } = useFirestoreCollection(user?.uid, 'transactions')
  const { confirm } = useConfirmCtx()
  const { toast } = useToastCtx()
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
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
      const d = toLocalDate(t.createdAt)
      if (!d) return
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      map[key] = (map[key] || 0) + 1
    })
    return map
  }, [transactions])

  const selectedDayTransactions = useMemo(
    () => getTransactionsForDate(transactions, selectedDate).sort((a, b) => {
      const da = toLocalDate(a.createdAt)
      const db = toLocalDate(b.createdAt)
      return (db?.getTime() || 0) - (da?.getTime() || 0)
    }),
    [transactions, selectedDate],
  )

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this transaction?')
    if (!ok) return
    try {
      await remove(id)
      toast('Transaction deleted', { type: 'success' })
    } catch {
      toast('Failed to delete transaction', { type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Calendar</p>
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Browse transactions by date.</p>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded-lg border p-2 hover:bg-accent transition-colors" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[140px] text-center text-sm font-medium">{formatShortDate(month)}</span>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-lg border p-2 hover:bg-accent transition-colors" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            const dateKey = `${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`
            const dayTxCount = txCountByDate[dateKey] || 0
            const isSelected = isSameDay(day.date, selectedDate)
            const today = isToday(day.date)
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day.date)}
                className={`relative flex flex-col items-center rounded-lg py-2 text-sm transition-colors ${
                  !day.currentMonth ? 'text-muted-foreground/40' : 'text-foreground'
                } ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : today ? 'bg-accent font-medium' : 'hover:bg-muted/50'}`}
              >
                {day.day}
                {dayTxCount > 0 && (
                  <span className={`mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                    isSelected ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'
                  }`}>
                    {dayTxCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Transactions */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{formatFullDate(selectedDate)}</h3>
          <span className="ml-auto text-xs text-muted-foreground">{selectedDayTransactions.length} transaction{selectedDayTransactions.length !== 1 ? 's' : ''}</span>
        </div>
        {selectedDayTransactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions on this date</div>
        ) : (
          <div className="divide-y">
            {selectedDayTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      t.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                    }`}>
                      {t.type === 'income' ? '📈' : '📉'} {t.type}
                    </span>
                    {t.category && <span className="text-xs text-muted-foreground">{t.category}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm tabular-nums font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {formatCurrency(t.amount || 0)}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => navigate(`/app/add?edit=${t.id}`)} className="rounded p-1 hover:bg-accent transition-colors" aria-label="Edit">
                      <Edit className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="rounded p-1 hover:bg-destructive/10 text-destructive transition-colors" aria-label="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
