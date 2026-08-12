const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

function twoDigitYear(y) {
  return y < 100 ? 2000 + y : y
}

function buildDate(y, m, d) {
  if (m < 0 || m > 11 || !y || !d) return null
  return new Date(twoDigitYear(y), m, d, 12, 0, 0, 0)
}

export function parseDateString(str, mode = 'AUTO') {
  if (str == null) return null
  const s = String(str).trim()
  if (!s) return null

  // ISO: 2025-01-05
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return buildDate(+m[1], +m[2] - 1, +m[3])

  // "5 Jan 2025", "05-Jan-2025", "5th Jan, 2025"
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)?[\s.,/-]+([A-Za-z]{3,9})[\s.,/-]+(\d{2,4})/)
  if (m) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, 3)]
    return mon == null ? null : buildDate(+m[3], mon, +m[1])
  }

  // "Jan 5, 2025", "Jan 05 25"
  m = s.match(/([A-Za-z]{3,9})[\s.,/-]+(\d{1,2})(?:st|nd|rd|th)?(?:[\s.,/-]+(\d{2,4}))?/)
  if (m) {
    const mon = MONTHS[m[1].toLowerCase().slice(0, 3)]
    if (mon != null) {
      const y = m[3] ? +m[3] : new Date().getFullYear()
      return buildDate(y, mon, +m[2])
    }
  }

  // Numeric: DD/MM/YYYY or MM/DD/YYYY (day-first for INR)
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    const a = +m[1]
    const b = +m[2]
    const c = +m[3]
    const dayFirst = mode === 'DMY' || (mode === 'AUTO' && (a > 12 || b > 12 ? a > 12 : true))
    if (mode === 'MDY') return buildDate(c, a - 1, b)
    if (dayFirst) return buildDate(c, b - 1, a)
    return buildDate(c, a - 1, b)
  }

  return null
}

export function parseAmount(str) {
  if (str == null) return null
  let s = String(str).trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.replace(/^\(|\)$/g, '')
  }
  if (/\b(dr|debit)\b/i.test(s)) negative = true
  s = s.replace(/[^0-9.\-]/g, '')
  if (!s) return null
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }
  const parts = s.split('.')
  if (parts.length > 2) s = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
  const val = Number(s)
  if (Number.isNaN(val)) return null
  const abs = Math.abs(val)
  if (abs === 0) return 0
  return negative ? -abs : abs
}

export function buildFingerprint(transactionDate, type, amount, description) {
  const d = transactionDate instanceof Date ? transactionDate.getTime() : 0
  const desc = String(description || '').toLowerCase().replace(/\s+/g, ' ').trim()
  return [d, type, Math.round(Math.abs(amount || 0) * 100), desc].join('::')
}

function normalizeCell(c) {
  return String(c ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isSeparatorRow(row) {
  const cells = (row || []).map((c) => String(c ?? '').trim()).filter(Boolean)
  if (cells.length === 0) return false
  return cells.every((c) => !/[a-z0-9]/i.test(c))
}

export function rowsToTransactions({ rows, headerIndex, mapping, mode = 'AUTO', defaultType = 'auto', defaultCategory = '', existing, dataEnd }) {
  const seen = new Set((existing || []).map((t) => {
    const raw = t.date || t.transactionDate
    const date = raw?.toDate ? raw.toDate() : raw instanceof Date ? raw : raw ? new Date(raw) : null
    return buildFingerprint(date, t.type, t.amount, t.description)
  }))
  const localSeen = new Set()

  const cell = (row, role) => {
    const idx = mapping.indexOf(role)
    return idx >= 0 ? (row[idx] == null ? '' : String(row[idx])) : ''
  }

  const items = []
  const dataStart = headerIndex >= 0 ? headerIndex + 1 : 0
  const stopAt = dataEnd != null ? dataEnd : rows.length
  const headerKey = headerIndex >= 0
    ? (rows[headerIndex] || []).map(normalizeCell).join('|')
    : null

  for (let r = dataStart; r < stopAt; r++) {
    const row = rows[r]
    if (!row || row.every((c) => String(c ?? '').trim() === '')) continue
    if (isSeparatorRow(row)) continue
    if (headerKey != null && row.map(normalizeCell).join('|') === headerKey) continue

    const errors = []
    const dateStr = cell(row, 'date')
    const descStr = cell(row, 'description').trim()

    const transactionDate = parseDateString(dateStr, mode)
    if (!transactionDate) errors.push('Unrecognized date')

    let amount = null
    let type = ''

    const debitAmt = parseAmount(cell(row, 'debit'))
    const creditAmt = parseAmount(cell(row, 'credit'))
    const singleAmt = parseAmount(cell(row, 'amount'))
    const typeRaw = cell(row, 'type').trim()

    if (debitAmt != null && creditAmt != null && (debitAmt > 0 || creditAmt > 0)) {
      if (debitAmt > 0) {
        amount = debitAmt
        type = 'expense'
      } else if (creditAmt > 0) {
        amount = creditAmt
        type = 'income'
      }
    } else if (debitAmt != null && debitAmt !== 0) {
      amount = Math.abs(debitAmt)
      type = 'expense'
    } else if (creditAmt != null && creditAmt !== 0) {
      amount = Math.abs(creditAmt)
      type = 'income'
    } else if (singleAmt != null) {
      amount = Math.abs(singleAmt)
      if (defaultType === 'income') type = 'income'
      else if (defaultType === 'expense') type = 'expense'
      else type = singleAmt < 0 ? 'expense' : 'income'
    } else if (typeRaw) {
      type = /(credit|cr\b|deposit|receipt|paid\s*in)/i.test(typeRaw) ? 'income' : 'expense'
    }

    if (amount == null || amount === 0) errors.push('Could not read amount')
    if (!type) type = 'expense'
    if (!descStr) errors.push('Missing description')

    const category = String(cell(row, 'category') || defaultCategory || '').trim()

    const fingerprint = buildFingerprint(transactionDate, type, amount, descStr)
    const duplicate = seen.has(fingerprint) || localSeen.has(fingerprint)
    if (!duplicate) localSeen.add(fingerprint)

    items.push({
      id: `r${r}`,
      rowIndex: r,
      date: transactionDate,
      description: descStr || cell(row, 'description').trim() || (cell(row, 'category') || '').trim() || 'Imported transaction',
      type,
      amount: amount == null ? 0 : Math.abs(amount),
      category,
      valid: !!(errors.length === 0 && transactionDate && amount),
      errors,
      duplicate,
      raw: row.slice(),
    })
  }

  return items
}
