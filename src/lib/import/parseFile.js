export const MAX_IMPORT_ROWS = 5000
export const MAX_FILE_SIZE = 15 * 1024 * 1024

function extOf(fileName) {
  const parts = String(fileName || '').split('.')
  return parts.length > 1 ? parts.pop() : ''
}

async function loadPapa() {
  const mod = await import('papaparse')
  return mod.default
}

function splitLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return []
  return trimmed.split(/\s{2,}/).map((c) => c.trim())
}

async function extractPdfRows(pdfjs, data) {
  const pdf = await pdfjs.getDocument({ data }).promise
  const rows = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const groups = new Map()
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = Math.round(item.transform[5] * 2)
      let key = null
      for (const gy of groups.keys()) {
        if (Math.abs(gy - y) <= 4) {
          key = gy
          break
        }
      }
      if (key == null) {
        key = y
        groups.set(key, [])
      }
      groups.get(key).push({ str: item.str, x: item.transform[4] })
    }
    const lines = [...groups.entries()].sort((a, b) => b[0] - a[0])
    for (const [, items] of lines) {
      items.sort((a, b) => a.x - b.x)
      const line = items.map((i) => i.str).join(' ')
      rows.push(splitLine(line))
    }
  }
  await pdf.destroy?.()
  return rows
}

export async function parseFile(file) {
  const fileName = file.name || 'statement'
  const ext = extOf(fileName).toLowerCase()
  const warnings = []

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum supported is ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
  }

  let rows = []
  let format = ext

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    const text = await file.text()
    const Papa = await loadPapa()
    const delimiter = ext === 'tsv' ? '\t' : undefined
    const result = Papa.parse(text, {
      delimiter,
      skipEmptyLines: 'greedy',
    })
    rows = result.data.map((row) => row.map((c) => (c == null ? '' : String(c))))
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buf, { type: 'array', cellDates: false })
    if (!wb.SheetNames.length) throw new Error('Excel file has no sheets.')
    const sheet = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
    rows = rows.map((row) => row.map((c) => (c == null ? '' : String(c))))
  } else if (ext === 'pdf') {
    const buf = await file.arrayBuffer()
    const pdfjs = await import('pdfjs-dist')
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    rows = await extractPdfRows(pdfjs, buf)
    warnings.push('PDF import extracts text from digital (non-scanned) statements. Scanned/image PDFs are not supported.')
  } else {
    throw new Error(`Unsupported file type ".${ext}". Please upload a CSV, TSV, XLSX, XLS, or PDF bank statement.`)
  }

  rows = rows.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))

  if (rows.length === 0) throw new Error('No data rows found in this file.')
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`File has ${rows.length.toLocaleString('en-IN')} rows. The maximum supported is ${MAX_IMPORT_ROWS.toLocaleString('en-IN')}.`)
  }

  return { fileName, format, rows, warnings }
}
