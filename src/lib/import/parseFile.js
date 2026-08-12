import { isTransactionRow } from './detect.js'

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

function encryptedError() {
  const err = new Error('This file is password-protected. Please enter the file password to continue.')
  err.code = 'ENCRYPTED'
  return err
}

function bufToLatin1(buf) {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return s
}

function isEncryptedXlsx(buf) {
  return /EncryptedPackage|encryptionInfo/i.test(bufToLatin1(buf))
}

function isEncryptedXls(buf) {
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length - 3; i++) {
    // BIFF FILEPASS record: id 0x002F then a small record length
    if (bytes[i] === 0x2f && bytes[i + 1] === 0x00 && bytes[i + 2] < 0x40 && bytes[i + 3] === 0x00) return true
  }
  return false
}

function cellsToText(row) {
  return row.map((c) => (c == null ? '' : String(c)))
}

function pickBestSheet(wb, XLSX) {
  let best = wb.SheetNames[0]
  let bestScore = -1
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false })
    let score = 0
    for (const r of rows) if (isTransactionRow(r)) score++
    if (score > bestScore) {
      best = name
      bestScore = score
    }
  }
  return best
}

async function parseExcel(buf, password) {
  const XLSX = await import('xlsx')
  const encrypted = isEncryptedXls(buf) || isEncryptedXlsx(buf)

  if (encrypted && !password) throw encryptedError()

  if (encrypted) {
    try {
      const cpt = await import('xlsx/dist/cpexcel.full.mjs')
      XLSX.set_cptable(cpt.default || cpt)
    } catch {
      // codepage table is optional for most encrypted files
    }
  }

  let wb
  try {
    wb = XLSX.read(buf, { type: 'array', cellDates: false, ...(encrypted ? { password } : {}) })
  } catch (e) {
    const msg = String(e?.message || e || '').trim()
    if (/password/i.test(msg) && password) throw new Error('Could not open the Excel file. The password may be incorrect.')
    throw new Error(msg ? `Could not open Excel file: ${msg}` : 'Could not open Excel file.')
  }

  if (!wb.SheetNames.length) throw new Error('Excel file has no sheets.')

  const sheetName = pickBestSheet(wb, XLSX)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false }).map(cellsToText)

  return {
    rows,
    warnings: encrypted ? ['Opened a password-protected Excel file.'] : [],
  }
}

function toPdfCells(items) {
  const cells = []
  let cur = ''
  let prevX = null
  for (const it of items) {
    if (prevX != null && it.x - prevX > 8 && cur.trim()) {
      cells.push(cur.trim())
      cur = ''
    }
    cur += (cur ? ' ' : '') + it.str
    prevX = it.x
  }
  if (cur.trim()) cells.push(cur.trim())
  return cells
}

async function extractPdfRows(pdfjs, data, password) {
  const pdf = await pdfjs.getDocument({ data, ...(password ? { password } : {}) }).promise
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
      rows.push(toPdfCells(items))
    }
  }
  await pdf.destroy?.()
  return rows
}

async function parsePdf(buf, password) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  try {
    const rows = await extractPdfRows(pdfjs, buf, password)
    return {
      rows,
      warnings: password ? ['Opened a password-protected PDF.'] : [],
      notes: ['PDF import extracts text from digital (non-scanned) statements. Scanned/image PDFs are not supported.'],
    }
  } catch (e) {
    const msg = String(e?.message || e || '')
    if (/password/i.test(msg)) {
      if (!password) throw encryptedError()
      throw new Error('Could not open the PDF. The password may be incorrect.')
    }
    throw new Error(msg ? `Could not read PDF: ${msg}` : 'Could not read PDF.')
  }
}

export async function parseFile(file, { password } = {}) {
  const fileName = file.name || 'statement'
  const ext = extOf(fileName).toLowerCase()
  const warnings = []

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum supported is ${MAX_FILE_SIZE / 1024 / 1024}MB.`)
  }

  let rows = []
  let format = ext
  let notes = []

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    const text = await file.text()
    const Papa = await loadPapa()
    const delimiter = ext === 'tsv' ? '\t' : undefined
    const result = Papa.parse(text, {
      delimiter,
      skipEmptyLines: 'greedy',
    })
    rows = result.data.map(cellsToText)
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer()
    const res = await parseExcel(buf, password)
    rows = res.rows
    warnings.push(...res.warnings)
  } else if (ext === 'pdf') {
    const buf = await file.arrayBuffer()
    const res = await parsePdf(buf, password)
    rows = res.rows
    warnings.push(...res.warnings)
    notes.push(...(res.notes || []))
  } else {
    throw new Error(`Unsupported file type ".${ext}". Please upload a CSV, TSV, XLSX, XLS, or PDF bank statement.`)
  }

  rows = rows.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))

  if (rows.length === 0) throw new Error('No data rows found in this file.')
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`File has ${rows.length.toLocaleString('en-IN')} rows. The maximum supported is ${MAX_IMPORT_ROWS.toLocaleString('en-IN')}.`)
  }

  warnings.push(...notes)

  return { fileName, format, rows, warnings }
}
