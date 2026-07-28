import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useFirestoreCollection } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/currency'
import { useToastCtx, useConfirmCtx } from '@/app/providers'
import { Plus, Trash2, Save } from 'lucide-react'

export default function CategoriesPage() {
  const { user } = useAuth()
  const { data: categories, add, update, remove } = useFirestoreCollection(user?.uid, 'categories')
  const { data: transactions } = useFirestoreCollection(user?.uid, 'transactions')
  const { toast } = useToastCtx()
  const { confirm } = useConfirmCtx()
  const [newName, setNewName] = useState('')
  const [budgetEdits, setBudgetEdits] = useState({})

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
    await add({ name, monthlyBudget: 0 })
    setNewName('')
  }

  const handleDelete = async (cat) => {
    const ok = await confirm(`Delete the "${cat.name}" category? Existing transactions will keep their saved category name.`)
    if (!ok) return
    await remove(cat.id)
  }

  const handleBudgetChange = (catId, value) => {
    setBudgetEdits((prev) => ({ ...prev, [catId]: value }))
  }

  const handleSaveBudgets = async () => {
    const updates = categories.map((cat) => {
      const val = Number(budgetEdits[cat.id] ?? cat.monthlyBudget ?? 0)
      return update(cat.id, { monthlyBudget: val > 0 ? val : 0 })
    })
    await Promise.all(updates)
    setBudgetEdits({})
    toast('Budgets saved', { type: 'success' })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">Planning</p>
        <h2 className="text-2xl font-bold tracking-tight">Budgets</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage categories and monthly spending limits.</p>
      </div>

      {/* Add Category */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Add Category</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., Personal, Education, Grocery"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={handleAdd} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Spent This Month</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Monthly Budget</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No categories yet</td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const spent = spentByCategory[cat.name] || 0
                  const budget = Number(budgetEdits[cat.id] ?? cat.monthlyBudget ?? 0)
                  return (
                    <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{cat.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={budgetEdits[cat.id] ?? cat.monthlyBudget ?? ''}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                          placeholder="No limit"
                          className="w-28 rounded-lg border bg-background px-3 py-1.5 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(cat)} className="rounded p-1.5 hover:bg-destructive/10 text-destructive transition-colors" aria-label={`Delete ${cat.name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {categories.length > 0 && (
          <div className="border-t px-4 py-3">
            <button onClick={handleSaveBudgets} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Save className="h-4 w-4" /> Save Budgets
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
