import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { formatShortDate } from '@/lib/date'
import { parseFile } from '@/lib/import/parseFile'
import { detectTable } from '@/lib/import/detect'
import { autoDetectRole, ROLE_OPTIONS } from '@/lib/import/mapping'
import { rowsToTransactions } from '@/lib/import/rowsToTransactions'
import { importTransactions } from '@/lib/import/importTransactions'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { UploadCloud, FileText, Check, CheckCheck, AlertTriangle, Loader2, ArrowDownToLine, RefreshCw, X, Tag, Lock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const ACCEPT = '.csv,.tsv,.txt,.xlsx,.xls,.pdf'

const DATE_MODES = [
  { value: 'AUTO', label: 'Auto (DD/MM/YYYY)' },
  { value: 'DMY', label: 'DD/MM/YYYY' },
  { value: 'MDY', label: 'MM/DD/YYYY' },
]

const TYPE_MODES = [
  { value: 'auto', label: 'From sign' },
  { value: 'income', label: 'All income' },
  { value: 'expense', label: 'All expenses' },
]

function RowCheck({ checked, onChange, disabled, label }) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="min-touch"
      disabled={disabled}
      onClick={onChange}
      aria-label={label}
    >
      {checked ? <Check className="h-4 w-4 text-primary" /> : null}
    </Button>
  )
}

function TypeToggle({ value, onChange }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v)
      }}
      size="sm"
    >
      <ToggleGroupItem value="expense" className="data-pressed:border-expense data-pressed:bg-expense/10 data-pressed:text-expense">
        Exp
      </ToggleGroupItem>
      <ToggleGroupItem value="income" className="data-pressed:border-income data-pressed:bg-income/10 data-pressed:text-income">
        Inc
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export default function ImportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: transactions } = useFirestoreCollection(user?.uid, 'transactions', 10000)

  const [stage, setStage] = useState('upload')
  const [parseResult, setParseResult] = useState(null)
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)

  const [headerIndex, setHeaderIndex] = useState(-1)
  const [mapping, setMapping] = useState([])
  const [dataEnd, setDataEnd] = useState(null)
  const [mode, setMode] = useState('AUTO')
  const [defaultType, setDefaultType] = useState('auto')
  const [defaultCategory, setDefaultCategory] = useState('')
  const [items, setItems] = useState([])
  const [excluded, setExcluded] = useState(() => new Set())
  const [includeDupes, setIncludeDupes] = useState(false)

  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const [pendingFile, setPendingFile] = useState(null)
  const [password, setPassword] = useState('')
  const [passwordPrompt, setPasswordPrompt] = useState(false)

  const fileInputRef = useRef(null)

  const colCount = parseResult ? parseResult.rows.reduce((max, r) => Math.max(max, r.length), 0) : 0

  const headerLabels = useMemo(() => {
    const labels = []
    for (let c = 0; c < colCount; c++) {
      if (headerIndex >= 0 && parseResult.rows[headerIndex]?.[c]) {
        labels.push(String(parseResult.rows[headerIndex][c]).trim())
      } else {
        labels.push(`Column ${c + 1}`)
      }
    }
    return labels
  }, [colCount, headerIndex, parseResult])

  useEffect(() => {
    if (!parseResult) return
    const next = rowsToTransactions({
      rows: parseResult.rows,
      headerIndex,
      mapping,
      mode,
      defaultType,
      defaultCategory,
      existing: transactions,
      dataEnd,
    })
    setItems(next)
  }, [parseResult, headerIndex, mapping, mode, defaultType, defaultCategory, transactions, dataEnd])

  const stats = useMemo(() => {
    const valid = items.filter((i) => i.valid).length
    const invalid = items.filter((i) => !i.valid).length
    const dupes = items.filter((i) => i.valid && i.duplicate).length
    const selected = items.filter((i) => i.valid && !excluded.has(i.id) && (includeDupes || !i.duplicate)).length
    const total = items.reduce((s, i) => s + (i.valid ? i.amount : 0), 0)
    return { valid, invalid, dupes, selected, total }
  }, [items, excluded, includeDupes])

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const handleFile = async (file, filePassword) => {
    if (!file) return
    setParsing(true)
    setFileName(file.name)
    try {
      const result = await parseFile(file, filePassword ? { password: filePassword } : {})
      const det = detectTable(result.rows)
      setParseResult(result)
      setHeaderIndex(det.headerIndex)
      setMapping(det.mapping)
      setDataEnd(det.dataEnd)
      setExcluded(new Set())
      setIncludeDupes(false)
      setPasswordPrompt(false)
      setPassword('')
      setStage('map')
    } catch (err) {
      console.error('Failed to parse file:', err)
      if (err.code === 'ENCRYPTED') {
        setPendingFile(file)
        setPasswordPrompt(true)
      } else {
        toast.error(err.message || 'Failed to parse file')
      }
    } finally {
      setParsing(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) return toast.warning('Enter the file password')
    await handleFile(pendingFile, password.trim())
  }

  const resetMapping = () => {
    const det = detectTable(parseResult.rows)
    setHeaderIndex(det.headerIndex)
    setMapping(det.mapping)
    setDataEnd(det.dataEnd)
  }

  const handleImport = async () => {
    const selected = items.filter((i) => i.valid && !excluded.has(i.id) && (includeDupes || !i.duplicate))
    if (selected.length === 0) return toast.warning('No valid transactions selected')

    setImporting(true)
    setImportedCount(0)
    try {
      const n = await importTransactions(user.uid, selected, (c) => setImportedCount(c))
      toast.success(`Imported ${n} transaction${n !== 1 ? 's' : ''}`)
      navigate('/app/transactions')
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('Import failed. Please check your connection and try again.')
    } finally {
      setImporting(false)
    }
  }

  const resetAll = () => {
    setStage('upload')
    setParseResult(null)
    setFileName('')
    setHeaderIndex(-1)
    setMapping([])
    setDataEnd(null)
    setItems([])
    setExcluded(new Set())
    setIncludeDupes(false)
    setMode('AUTO')
    setDefaultType('auto')
    setDefaultCategory('')
    setPendingFile(null)
    setPassword('')
    setPasswordPrompt(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (stage === 'upload') {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Import</p>
          <h2 className="text-2xl font-bold tracking-tight">Bank Statement Import</h2>
          <p className="mt-1 text-sm text-muted-foreground">Upload a statement from your bank and turn it into transactions.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: FileText, title: 'CSV / TSV', desc: 'Most Indian banks export statements as CSV.' },
            { icon: UploadCloud, title: 'Excel', desc: 'XLSX / XLS files are parsed automatically.' },
            { icon: FileText, title: 'PDF', desc: 'Text-based (digital) statement PDFs supported.' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {passwordPrompt ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Password-protected file</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fileName} is encrypted. Enter its password to continue.
                    </p>
                  </div>
                </div>
                <Input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="File password"
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={parsing}>
                    {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {parsing ? 'Opening…' : 'Open file'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPasswordPrompt(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    handleFile(e.dataTransfer.files?.[0])
                  }}
                  className={cn(
                    'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-14 text-center transition-colors',
                    dragOver ? 'border-primary bg-primary/5' : 'border-border hoverable:hover:border-primary/50 hoverable:hover:bg-muted/30',
                    parsing && 'pointer-events-none opacity-60',
                  )}
                >
                  {parsing ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Parsing {fileName || 'file'}…</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">Drag & drop your statement here</p>
                      <p className="text-xs text-muted-foreground">or click to browse · CSV, TSV, XLSX, XLS, PDF</p>
                      <p className="text-xs text-muted-foreground">
                        Works with any Indian bank · password-protected Excel & PDF supported
                      </p>
                    </>
                  )}
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Import</p>
          <h2 className="text-2xl font-bold tracking-tight">Review & Import</h2>
          <p className="mt-1 text-sm text-muted-foreground truncate max-w-full">{fileName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetAll}>
            <X className="h-4 w-4" /> Change file
          </Button>
        </div>
      </div>

      {parseResult?.warnings?.map((w) => (
        <div key={w} className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{w}</span>
        </div>
      ))}

      {/* Mapping controls */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Column Mapping</CardTitle>
          <Button variant="outline" size="sm" onClick={resetMapping}>
            <RefreshCw className="h-3 w-3" /> Auto-detect
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date format</label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_MODES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Single amount column type</label>
              <Select value={defaultType} onValueChange={setDefaultType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_MODES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category for all rows</label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  placeholder="Optional"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: colCount }).map((_, c) => {
              const role = mapping[c] || 'ignore'
              const auto = autoDetectRole(headerLabels[c])
              return (
                <div key={c} className="space-y-1">
                  <label className="block truncate text-xs font-medium text-muted-foreground" title={headerLabels[c]}>
                    {headerLabels[c]}
                  </label>
                  <Select
                    value={role}
                    onValueChange={(v) => {
                      const next = mapping.slice()
                      const prevIdx = next.indexOf(v)
                      if (prevIdx >= 0) next[prevIdx] = 'ignore'
                      next[c] = v
                      setMapping(next)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {auto && auto !== 'ignore' && auto !== role && (
                    <p className="text-[10px] text-muted-foreground">Detected: {ROLE_OPTIONS.find((r) => r.value === auto)?.label}</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{stats.valid} valid</Badge>
            {stats.dupes > 0 && <Badge variant="outline">{stats.dupes} duplicate</Badge>}
            {stats.invalid > 0 && <Badge variant="destructive">{stats.invalid} skipped</Badge>}
            {stats.selected > 0 && (
              <span className="text-xs text-muted-foreground">
                {stats.selected} will be imported · {formatCurrency(stats.total)}
              </span>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDupes}
              onChange={(e) => setIncludeDupes(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Include duplicates
          </label>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No data rows found.</div>
          ) : (
            <>
              {/* Mobile list */}
              <div className="space-y-2 p-3 sm:hidden">
                {items.map((i) => (
                  <Card key={i.id} className={cn(!i.valid && 'opacity-60')}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{i.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {i.date ? formatShortDate(i.date) : '—'} · {formatCurrency(i.amount)}
                          </p>
                        </div>
                        <TypeToggle value={i.type} onChange={(v) => updateItem(i.id, { type: v })} />
                        <RowCheck
                          checked={!excluded.has(i.id) && i.valid}
                          disabled={!i.valid}
                          onChange={() => {
                            const next = new Set(excluded)
                            if (next.has(i.id)) next.delete(i.id)
                            else next.add(i.id)
                            setExcluded(next)
                          }}
                          label="Include row"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={i.category}
                          onChange={(e) => updateItem(i.id, { category: e.target.value })}
                          placeholder="Category"
                          className="h-9 flex-1"
                        />
                        {i.duplicate && <Badge variant="outline" className="shrink-0">Duplicate</Badge>}
                        {!i.valid && <Badge variant="destructive" className="shrink-0">Invalid</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.id} className={cn(!i.valid && 'opacity-60')}>
                        <TableCell>
                          <RowCheck
                            checked={!excluded.has(i.id) && i.valid}
                            disabled={!i.valid}
                            onChange={() => {
                              const next = new Set(excluded)
                              if (next.has(i.id)) next.delete(i.id)
                              else next.add(i.id)
                              setExcluded(next)
                            }}
                            label="Include row"
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {i.date ? formatShortDate(i.date) : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate font-medium" title={i.description}>{i.description}</p>
                        </TableCell>
                        <TableCell>
                          <TypeToggle value={i.type} onChange={(v) => updateItem(i.id, { type: v })} />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={i.category}
                            onChange={(e) => updateItem(i.id, { category: e.target.value })}
                            placeholder="—"
                            className="h-9 w-36"
                          />
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${i.type === 'income' ? 'text-income' : 'text-expense'}`}>
                          {formatCurrency(i.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!i.valid ? (
                            <Badge variant="destructive">{i.errors.join(', ')}</Badge>
                          ) : i.duplicate ? (
                            <Badge variant="outline">Duplicate</Badge>
                          ) : (
                            <CheckCheck className="ml-auto h-4 w-4 text-income" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {stats.selected} transaction{stats.selected !== 1 ? 's' : ''} ready · {formatCurrency(stats.total)}
        </p>
        <Button size="lg" onClick={handleImport} disabled={importing || stats.selected === 0} className="w-full sm:w-auto">
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing {importedCount > 0 ? `${importedCount}…` : ''}
            </>
          ) : (
            <>
              <ArrowDownToLine className="h-4 w-4" />
              Import {stats.selected > 0 ? `${stats.selected} transaction${stats.selected !== 1 ? 's' : ''}` : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
