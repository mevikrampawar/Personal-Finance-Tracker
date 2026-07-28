import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { useToastCtx } from '@/app/providers'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia } from '@/components/ui/alert-dialog'

export default function NetWorthPage() {
  const { user } = useAuth()
  const { data: assets, loading: assetsLoading, add: addAsset, remove: removeAsset } = useFirestoreCollection(user?.uid, 'assets')
  const { data: liabilities, loading: liabilitiesLoading, add: addLiability, remove: removeLiability } = useFirestoreCollection(user?.uid, 'liabilities')
  const { toast } = useToastCtx()

  const [assetName, setAssetName] = useState('')
  const [assetAmount, setAssetAmount] = useState('')
  const [liabilityName, setLiabilityName] = useState('')
  const [liabilityAmount, setLiabilityAmount] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteType, setDeleteType] = useState(null)

  const totalAssets = assets.reduce((s, a) => s + (a.amount || 0), 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + (l.amount || 0), 0)
  const netWorth = totalAssets - totalLiabilities

  const sanitizeAmount = (val) => {
    const n = Number(val)
    return { valid: !Number.isNaN(n) && isFinite(n) && n > 0, value: n }
  }

  const handleAddAsset = async (e) => {
    e.preventDefault()
    if (!assetName.trim() || !assetAmount) return toast('Fill in name and amount', { type: 'warning' })
    const { valid, value: amt } = sanitizeAmount(assetAmount)
    if (!valid) return toast('Enter a valid amount', { type: 'warning' })
    try {
      await addAsset({ name: assetName.trim(), amount: amt, type: 'asset' })
      setAssetName('')
      setAssetAmount('')
      toast('Asset added', { type: 'success' })
    } catch {
      toast('Failed to add asset', { type: 'error' })
    }
  }

  const handleAddLiability = async (e) => {
    e.preventDefault()
    if (!liabilityName.trim() || !liabilityAmount) return toast('Fill in name and amount', { type: 'warning' })
    const { valid, value: amt } = sanitizeAmount(liabilityAmount)
    if (!valid) return toast('Enter a valid amount', { type: 'warning' })
    try {
      await addLiability({ name: liabilityName.trim(), amount: amt, type: 'liability' })
      setLiabilityName('')
      setLiabilityAmount('')
      toast('Liability added', { type: 'success' })
    } catch {
      toast('Failed to add liability', { type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteType === 'asset') {
        await removeAsset(deleteTarget.id)
      } else {
        await removeLiability(deleteTarget.id)
      }
      setDeleteTarget(null)
      setDeleteType(null)
      toast(`${deleteType === 'asset' ? 'Asset' : 'Liability'} deleted`, { type: 'success' })
    } catch {
      toast('Failed to delete', { type: 'error' })
    }
  }

  const isLoading = assetsLoading || liabilitiesLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Wealth</p>
        <h2 className="text-2xl font-bold tracking-tight">Net Worth</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track your assets and liabilities.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-income">
              <TrendingUp className="h-4 w-4" /> Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-income">{formatCurrency(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-expense">
              <TrendingDown className="h-4 w-4" /> Total Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-expense">{formatCurrency(totalLiabilities)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold tabular-nums ${netWorth >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(netWorth)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-income" /> Add Asset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAsset} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="text"
                  placeholder="Name (e.g., Savings, Investment)"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="sm:flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  value={assetAmount}
                  onChange={(e) => setAssetAmount(e.target.value)}
                  className="sm:w-28"
                />
                <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No assets added</p>
              ) : (
                <div className="divide-y">
                  {assets.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium">{a.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm tabular-nums text-income">{formatCurrency(a.amount)}</span>
                        <AlertDialog
                          open={deleteTarget?.id === a.id && deleteType === 'asset'}
                          onOpenChange={(open) => {
                            if (!open) { setDeleteTarget(null); setDeleteType(null) }
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive"
                              onClick={() => { setDeleteTarget(a); setDeleteType('asset') }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
                              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                              <AlertDialogDescription>Delete &ldquo;{a.name}&rdquo;?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => { setDeleteTarget(null); setDeleteType(null) }}>Cancel</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-expense" /> Add Liability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddLiability} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="text"
                  placeholder="Name (e.g., Loan, Credit Card)"
                  value={liabilityName}
                  onChange={(e) => setLiabilityName(e.target.value)}
                  className="sm:flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  value={liabilityAmount}
                  onChange={(e) => setLiabilityAmount(e.target.value)}
                  className="sm:w-28"
                />
                <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              {liabilities.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No liabilities added</p>
              ) : (
                <div className="divide-y">
                  {liabilities.map((l) => (
                    <div key={l.id} className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium">{l.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm tabular-nums text-expense">{formatCurrency(l.amount)}</span>
                        <AlertDialog
                          open={deleteTarget?.id === l.id && deleteType === 'liability'}
                          onOpenChange={(open) => {
                            if (!open) { setDeleteTarget(null); setDeleteType(null) }
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive"
                              onClick={() => { setDeleteTarget(l); setDeleteType('liability') }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
                              <AlertDialogTitle>Delete Liability</AlertDialogTitle>
                              <AlertDialogDescription>Delete &ldquo;{l.name}&rdquo;?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => { setDeleteTarget(null); setDeleteType(null) }}>Cancel</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
