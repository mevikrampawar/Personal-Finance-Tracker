function sanitizeCSVField(value) {
  const str = String(value).replaceAll('"', '""')
  if (/^[=+\-@\t\r]/.test(str)) return `'${str}`
  return `"${str}"`
}

function buildCSV(header, rows) {
  return [header, ...rows]
    .map((row) => row.map(sanitizeCSVField).join(','))
    .join('\n')
}

function downloadCSV(text, filename) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportToCSV(transactions, filename) {
  const header = ['Date', 'Description', 'Type', 'Category', 'Amount']
  const rows = transactions.map((t) => {
    const dateSource = t.transactionDate || t.createdAt
    const d = dateSource?.toDate ? dateSource.toDate() : new Date(dateSource)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return [dateStr, t.description || '', t.type || '', t.category || '', t.amount || 0]
  })
  downloadCSV(buildCSV(header, rows), filename)
}

export function exportCSVData(header, rows, filename) {
  downloadCSV(buildCSV(header, rows), filename)
}
