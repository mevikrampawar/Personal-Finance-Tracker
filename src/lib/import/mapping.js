export const ROLE_OPTIONS = [
  { value: 'ignore', label: 'Ignore' },
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'debit', label: 'Withdrawal / Debit' },
  { value: 'credit', label: 'Deposit / Credit' },
  { value: 'balance', label: 'Balance' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type (Dr / Cr text)' },
]

export function normalizeHeader(header) {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function autoDetectRole(header) {
  const h = normalizeHeader(header)
  if (!h) return 'ignore'
  if (/(date|posted|transdt|valuedt|value date|txndate)/.test(h)) return 'date'
  if (h === 'dr' || h === 'debit') return 'debit'
  if (h === 'cr' || h === 'credit') return 'credit'
  if (/(withdraw|debit|payment|dr amount|paid out|paidout|money out)/.test(h)) return 'debit'
  if (/(deposit|credit|receipt|cr amount|paid in|paidin|money in)/.test(h)) return 'credit'
  if (/(balance|bal)/.test(h)) return 'balance'
  if (/(amount|amt)/.test(h)) return 'amount'
  if (/(categor)/.test(h)) return 'category'
  if (/(narrat|particular|description|detail|memo|remark|reference|payee|merchant|beneficiary|transaction)/.test(h)) return 'description'
  if (/(type|kind)/.test(h)) return 'type'
  return 'ignore'
}

export function detectHeaderRow(rows) {
  let best = -1
  let bestScore = 0
  const lookMax = Math.min(rows.length, 12)
  for (let i = 0; i < lookMax; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue
    const roles = row.map(autoDetectRole)
    const score = roles.filter((r) => r === 'date' || r === 'amount' || r === 'debit' || r === 'credit' || r === 'description').length
    const cells = row.map((c) => String(c).trim()).filter(Boolean)
    const looksNumeric = cells.length > 0 && cells.every((c) => /^-?[\d,.₹\s]+$/.test(c))
    if (score >= 2 && !looksNumeric && score > bestScore) {
      best = i
      bestScore = score
    }
  }
  return best
}

export function autoMapping(rows, headerIndex) {
  const colCount = rows.reduce((max, r) => Math.max(max, r.length), 0)
  const mapping = Array(colCount).fill('ignore')
  if (headerIndex >= 0) {
    for (let c = 0; c < colCount; c++) {
      const header = rows[headerIndex][c]
      const role = autoDetectRole(header)
      if (role !== 'ignore' && !mapping.includes(role)) {
        mapping[c] = role
      }
    }
  } else {
    const sampleCount = Math.min(rows.length, 20)
    const numericCols = []
    for (let c = 0; c < colCount; c++) {
      let dates = 0
      let nums = 0
      let texts = 0
      for (let r = 0; r < sampleCount; r++) {
        const v = String(rows[r]?.[c] ?? '').trim()
        if (!v) continue
        if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(v) || /[A-Za-z]{3,9}[\s.,/-]+\d{1,2}(?:st|nd|rd|th)?/.test(v)) dates++
        else if (/^-?[\d,.₹()\s]+$/.test(v)) nums++
        else texts++
      }
      if (dates >= Math.max(1, sampleCount / 3)) mapping[c] = 'date'
      else if (nums > 0 && nums >= texts) numericCols.push(c)
    }
    if (numericCols.length === 1) {
      mapping[numericCols[0]] = 'amount'
    } else if (numericCols.length === 2) {
      mapping[numericCols[0]] = 'debit'
      mapping[numericCols[1]] = 'credit'
    } else if (numericCols.length >= 3) {
      mapping[numericCols[0]] = 'amount'
    }
    for (let c = 0; c < colCount; c++) {
      if (mapping[c] !== 'ignore') continue
      let texts = 0
      for (let r = 0; r < sampleCount; r++) {
        const v = String(rows[r]?.[c] ?? '').trim()
        if (v && !/^-?[\d,.₹()\s]+$/.test(v)) texts++
      }
      if (texts >= Math.max(1, sampleCount / 3)) mapping[c] = 'description'
    }
  }
  return mapping
}
