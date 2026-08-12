import { autoDetectRole } from './mapping.js'

const DATE_RE = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)?$/i
const DATE_DMY_MONTH_RE = /^\d{1,2}[-/.\s][A-Za-z]{3,9}[-/.\s]\d{2,4}$/
const DATE_MONTH_FIRST_RE = /^[A-Za-z]{3,9}[-/.\s]\d{1,2}(?:[-/.\s]\d{2,4})?$/
const NUM_RE = /^-?\d[\d,]*(?:\.\d+)?$/
const MONEY_RE = /^(?:[₹$]\s*)?\(?-?[\d,]+(?:\.\d+)?\)?\s*(?:dr|cr|debit|credit)?$/i

const HEADER_ROLES = new Set(['date', 'amount', 'debit', 'credit', 'description', 'balance'])

export function cellClass(v) {
  const s = String(v ?? '').trim()
  if (!s) return 'empty'
  if (DATE_RE.test(s) || DATE_DMY_MONTH_RE.test(s) || DATE_MONTH_FIRST_RE.test(s)) return 'date'
  if (NUM_RE.test(s) || MONEY_RE.test(s)) return 'amount'
  return 'text'
}

export function isTransactionRow(row) {
  if (!Array.isArray(row)) return false
  let dates = 0
  let amounts = 0
  let cells = 0
  for (const c of row) {
    const k = cellClass(c)
    if (k === 'date') dates++
    else if (k === 'amount') amounts++
    if (String(c ?? '').trim()) cells++
  }
  return dates >= 1 && amounts >= 1 && cells >= 2
}

function isAllNumericRow(row) {
  const cells = (row || []).map((c) => String(c ?? '').trim()).filter(Boolean)
  if (cells.length === 0) return false
  return cells.every((c) => /^-?[\d,.₹()\s]+$/.test(c))
}

function isSeparatorRow(row) {
  const cells = (row || []).map((c) => String(c ?? '').trim()).filter(Boolean)
  if (cells.length === 0) return false
  return cells.every((c) => !/[a-z0-9]/i.test(c))
}

export function detectHeaderRow(rows) {
  const firstData = rows.findIndex(isTransactionRow)
  if (firstData < 0) {
    // No recognizable transaction rows; fall back to keyword scan over the preamble
    const lookMax = Math.min(rows.length, 40)
    let best = -1
    let bestScore = 0
    for (let i = 0; i < lookMax; i++) {
      const score = rows[i].map(autoDetectRole).filter((r) => HEADER_ROLES.has(r)).length
      if (score >= 2 && !isAllNumericRow(rows[i]) && score > bestScore) {
        best = i
        bestScore = score
      }
    }
    return best
  }

  // Nearest header-like row above the first data row
  for (let i = firstData - 1; i >= 0; i--) {
    const row = rows[i]
    if (!row || isSeparatorRow(row) || isAllNumericRow(row)) continue
    const score = row.map(autoDetectRole).filter((r) => HEADER_ROLES.has(r)).length
    if (score >= 2) return i
  }
  for (let i = firstData - 1; i >= 0; i--) {
    const row = rows[i]
    if (!row || isSeparatorRow(row) || isAllNumericRow(row)) continue
    const score = row.map(autoDetectRole).filter((r) => HEADER_ROLES.has(r)).length
    if (score === 1) return i
  }

  // No keyword header found — use the row directly above the first data row if it is
  // non-numeric (a plain text header row with unknown vocabulary)
  const above = rows[firstData - 1]
  if (above && !isAllNumericRow(above) && !isSeparatorRow(above)) return firstData - 1

  return -1
}

function isIdColumn(rows, c, start, end) {
  let count = 0
  let long = 0
  for (let r = start; r < end; r++) {
    const row = rows[r]
    if (!row || !isTransactionRow(row)) continue
    const v = String(row[c] ?? '').trim().replace(/\D/g, '')
    if (!v) continue
    count++
    if (v.length >= 9) long++
  }
  return count > 0 && long / count >= 0.6
}

export function detectMapping(rows, headerIndex) {
  const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const mapping = Array(colCount).fill('ignore')
  const claimed = new Set()
  const setRole = (c, role) => {
    if (mapping[c] === 'ignore' && !claimed.has(role)) {
      mapping[c] = role
      claimed.add(role)
    }
  }

  if (headerIndex >= 0) {
    for (let c = 0; c < colCount; c++) {
      setRole(c, autoDetectRole(rows[headerIndex]?.[c]))
    }
  }

  const start = headerIndex >= 0 ? headerIndex + 1 : 0
  const end = Math.min(rows.length, start + 1000)

  const cols = Array.from({ length: colCount }, () => ({ dates: 0, amounts: 0, texts: 0, nonEmpty: 0 }))
  for (let r = start; r < end; r++) {
    const row = rows[r]
    if (!row || !isTransactionRow(row)) continue
    for (let c = 0; c < colCount; c++) {
      const k = cellClass(row[c])
      if (k === 'date') cols[c].dates++
      else if (k === 'amount') cols[c].amounts++
      else if (k === 'text') cols[c].texts++
      if (String(row[c] ?? '').trim()) cols[c].nonEmpty++
    }
  }

  for (let c = 0; c < colCount; c++) {
    const col = cols[c]
    if (mapping[c] === 'ignore' && col.nonEmpty > 0 && col.dates / col.nonEmpty >= 0.5) {
      setRole(c, 'date')
    }
  }

  const numericCols = []
  for (let c = 0; c < colCount; c++) {
    const col = cols[c]
    if (mapping[c] !== 'ignore') continue
    if (isIdColumn(rows, c, start, end)) continue
    if (col.nonEmpty > 0 && col.amounts / col.nonEmpty >= 0.5) numericCols.push(c)
  }

  if (numericCols.length === 1) {
    setRole(numericCols[0], 'amount')
  } else if (numericCols.length === 2) {
    setRole(numericCols[0], 'debit')
    setRole(numericCols[1], 'credit')
  } else if (numericCols.length >= 3) {
    setRole(numericCols[numericCols.length - 1], 'balance')
    setRole(numericCols[0], 'debit')
    setRole(numericCols[1], 'credit')
    if (numericCols.length === 4) setRole(numericCols[2], 'amount')
  }

  const textCols = []
  for (let c = 0; c < colCount; c++) {
    const col = cols[c]
    if (mapping[c] !== 'ignore') continue
    if (col.nonEmpty > 0 && col.texts / col.nonEmpty >= 0.4) textCols.push(c)
  }
  textCols.sort((a, b) => cols[b].texts - cols[a].texts)
  for (const c of textCols) {
    if (claimed.has('description')) break
    setRole(c, 'description')
  }

  return mapping
}

export function detectTable(rows) {
  const headerIndex = detectHeaderRow(rows)
  const mapping = detectMapping(rows, headerIndex)
  const firstData = rows.findIndex(isTransactionRow)
  const lastData = rows.map(isTransactionRow).lastIndexOf(true)
  return {
    headerIndex,
    mapping,
    dataStart: headerIndex >= 0 ? headerIndex + 1 : firstData >= 0 ? firstData : 0,
    dataEnd: lastData >= 0 ? lastData + 1 : rows.length,
  }
}
