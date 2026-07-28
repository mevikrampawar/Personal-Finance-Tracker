import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { useToastCtx } from '@/app/providers'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

export default function NetWorthPage() {
  const { user } = useAuth()
  const { data: assets, add: addAsset, remove: removeAsset } = useFirestoreCollection(user?.uid, 'assets')
  const { data: liabilities, add: addLiability, remove: removeLiability } = useFirestoreCollection(user?.uid, 'liabilities')
  const { toast } = useToastCtx()

  const [assetName, setAssetName] = useState('')
  const [assetAmount, setAssetAmount] = useState('')
  const [liabilityName, setLiabilityName] = useState('')
  const [liabilityAmount, setLiabilityAmount] = useState('')

  const totalAssets = assets.reduce((s, a) => s + (a.amount || 0), 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + (l.amount || 0), 0)
  const netWorth = totalAssets - totalLiabilities

  const handleAddAsset = async (e) => {
    e.preventDefault()
    if (!assetName.trim() || !assetAmount) return toast('Fill in name and amount', { type: 'warning' })
    await addAsset({ name: assetName.trim(), amount: parseFloat(assetAmount), type: 'asset' })
    setAssetName('')
    setAssetAmount('')
  }

  const handleAddLiability = async (e) => {
    e.preventDefault()
    if (!liabilityName.trim() || !liabilityAmount) return toast('Fill in name and amount', { type: 'warning' })
    await addLiability({ name: liabilityName.trim(), amount: parseFloat(liabilityAmount), type: 'liability' })
    setLiabilityName('')
    setLiabilityAmount('')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Wealth</p>
        <h2 className="text-2xl font-bold tracking-tight">Net Worth</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track your assets and liabilities.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-income" /> Total Assets
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-income">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-expense" /> Total Liabilities
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-expense">{formatCurrency(totalLiabilities)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Net Worth</div>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${netWorth >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(netWorth)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assets */}
        <div className="space-y-4">
          <form onSubmit={handleAddAsset} className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-income" /> Add Asset</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Name (e.g., Savings, Investment)" value={assetName} onChange={(e) => setAssetName(e.target.value)} className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="number" placeholder="Amount" min="0" step="0.01" value={assetAmount} onChange={(e) => setAssetAmount(e.target.value)} className="w-28 rounded-lg border bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" className="rounded-lg bg-income/10 p-2 text-income hover:bg-income/20 transition-colors"><Plus className="h-4 w-4" /></button>
            </div>
          </form>
          <div className="rounded-xl border bg-card shadow-sm divide-y">
            {assets.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No assets added</div>
            ) : (
              assets.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium">{a.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums text-income">{formatCurrency(a.amount)}</span>
                    <button onClick={() => removeAsset(a.id)} className="rounded p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Liabilities */}
        <div className="space-y-4">
          <form onSubmit={handleAddLiability} className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-expense" /> Add Liability</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Name (e.g., Loan, Credit Card)" value={liabilityName} onChange={(e) => setLiabilityName(e.target.value)} className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="number" placeholder="Amount" min="0" step="0.01" value={liabilityAmount} onChange={(e) => setLiabilityAmount(e.target.value)} className="w-28 rounded-lg border bg-background px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
              <button type="submit" className="rounded-lg bg-expense/10 p-2 text-expense hover:bg-expense/20 transition-colors"><Plus className="h-4 w-4" /></button>
            </div>
          </form>
          <div className="rounded-xl border bg-card shadow-sm divide-y">
            {liabilities.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No liabilities added</div>
            ) : (
              liabilities.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium">{l.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums text-expense">{formatCurrency(l.amount)}</span>
                    <button onClick={() => removeLiability(l.id)} className="rounded p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
