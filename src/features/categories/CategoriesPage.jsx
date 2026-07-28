import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { useToastCtx } from '@/app/providers'
import { Plus, Trash2, Save } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogMedia } from '@/components/ui/alert-dialog'

export default function CategoriesPage() {
  const { user } = useAuth()
  const { data: categories, loading, add, update, remove } = useFirestoreCollection(user?.uid, 'categories')
  const { data: transactions } = useFirestoreCollection(user?.uid, 'transactions')
  const { toast } = useToastCtx()
  const [newName, setNewName] = useState('')
  const [budgetEdits, setBudgetEdits] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const expenses = transactions.filter((t) => t.type === 'expense')
  const spentByCategory = {}
  expenses.forEach((t) => {
    const cat = t.category || 'Uncategorized'
    spentByCategory[cat] = (spentByCategory[cat] || 0) + (t.amount || 0)
  })

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return toast('Please enter a category name', { type: 'warning' })
    if (categories.some((c) => c.name === name)) return toast('Category already exists', { type: 'warning' })
    try {
      await add({ name, monthlyBudget: 0 })
      setNewName('')
      toast('Category added', { type: 'success' })
    } catch {
      toast('Failed to add category', { type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
      toast('Category deleted', { type: 'success' })
    } catch {
      toast('Failed to delete category', { type: 'error' })
    }
  }

  const handleBudgetChange = (catId, value) => {
    setBudgetEdits((prev) => ({ ...prev, [catId]: value }))
  }

  const handleSaveBudgets = async () => {
    try {
      const updates = categories.map((cat) => {
        const val = Number(budgetEdits[cat.id] ?? cat.monthlyBudget ?? 0)
        return update(cat.id, { monthlyBudget: val > 0 ? val : 0 })
      })
      await Promise.all(updates)
      setBudgetEdits({})
      toast('Budgets saved', { type: 'success' })
    } catch {
      toast('Failed to save budgets', { type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-40" />
        </div>
        <Card>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Planning</p>
        <h2 className="text-2xl font-bold tracking-tight">Budgets</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage categories and monthly spending limits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., Personal, Education, Grocery"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No categories yet</p>
          ) : (
            <div className="divide-y">
              {categories.map((cat) => {
                const spent = spentByCategory[cat.name] || 0
                return (
                  <div key={cat.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">Spent: {formatCurrency(spent)}</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={budgetEdits[cat.id] ?? cat.monthlyBudget ?? ''}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                          placeholder="Budget"
                          className="w-28 text-right"
                        />
                      <AlertDialog open={deleteTarget?.id === cat.id} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-touch text-destructive"
                            onClick={() => setDeleteTarget(cat)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete &ldquo;{cat.name}&rdquo;? Existing transactions will keep their saved category name.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
        {categories.length > 0 && (
          <div className="border-t px-4 py-3">
            <Button onClick={handleSaveBudgets}>
              <Save className="h-4 w-4" /> Save Budgets
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
