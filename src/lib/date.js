import { format, parse, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths, eachDayOfInterval, getDay, getDaysInMonth } from 'date-fns'

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatMonthYear(date) {
  return format(date, 'MMMM yyyy')
}

export function formatShortDate(date) {
  return format(date, 'MMM d')
}

export function formatFullDate(date) {
  return format(date, 'EEEE, MMMM d, yyyy')
}

export function formatInputDate(date) {
  return format(date, 'yyyy-MM-dd')
}

export function parseInputDate(str) {
  return parse(str, 'yyyy-MM-dd', new Date())
}

export function parseYearMonth(str) {
  return parse(str, 'yyyy-MM', new Date())
}

export function formatYearMonth(date) {
  return format(date, 'yyyy-MM')
}

export function getTransactionsForMonth(transactions, month) {
  if (!Array.isArray(transactions) || !month) return []
  return transactions.filter((t) => {
    if (!t.createdAt) return false
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt)
    return isSameMonth(d, month)
  })
}

export function getTransactionsForDate(transactions, date) {
  if (!Array.isArray(transactions) || !date) return []
  return transactions.filter((t) => {
    if (!t.createdAt) return false
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt)
    return isSameDay(d, date)
  })
}

export function toLocalDate(firestoreDate) {
  if (!firestoreDate) return null
  return firestoreDate.toDate ? firestoreDate.toDate() : new Date(firestoreDate)
}
