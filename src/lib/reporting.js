function transactionDate(t) {
  if (!t) return null
  const source = t.transactionDate || t.createdAt
  if (!source) return null
  return source.toDate ? source.toDate() : new Date(source)
}

export function getTransactionsInRange(transactions, start, end) {
  if (!Array.isArray(transactions)) return []
  const startMs = start.getTime()
  const endMs = end.getTime()
  return transactions.filter((t) => {
    const d = transactionDate(t)
    return d && d.getTime() >= startMs && d.getTime() <= endMs
  })
}

export function computeSummary(transactions) {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    const amt = t.amount || 0
    if (t.type === 'income') income += amt
    else expenses += amt
  }
  return {
    income,
    expenses,
    net: income - expenses,
    count: transactions.length,
  }
}

export function categoryTotals(transactions) {
  const totals = {}
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const cat = t.category || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + (t.amount || 0)
  }
  return Object.entries(totals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function dailySeries(transactions, start, end) {
  const dayMs = 24 * 60 * 60 * 1000
  const series = []
  const byDay = new Map()
  for (const t of transactions) {
    const d = transactionDate(t)
    if (!d) continue
    const key = startOfDayKey(d)
    const entry = byDay.get(key) || { income: 0, expense: 0 }
    if (t.type === 'income') entry.income += t.amount || 0
    else entry.expense += t.amount || 0
    byDay.set(key, entry)
  }
  for (let ts = start.getTime(); ts <= end.getTime(); ts += dayMs) {
    const d = new Date(ts)
    const key = startOfDayKey(d)
    const entry = byDay.get(key) || { income: 0, expense: 0 }
    series.push({ date: d, day: d.getDate(), income: entry.income, expense: entry.expense })
  }
  return series
}

function startOfDayKey(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function topExpenses(transactions, n = 5) {
  return transactions
    .filter((t) => t.type === 'expense')
    .slice()
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, n)
}

export function formatRangeLabel(start, end, fmt) {
  return `${fmt(start)} – ${fmt(end)}`
}
