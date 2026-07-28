export function exportToCSV(transactions, filename) {
  const header = ['Date', 'Description', 'Type', 'Category', 'Amount']
  const rows = transactions.map((t) => {
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return [dateStr, t.description || '', t.type || '', t.category || '', t.amount || 0]
  })
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
