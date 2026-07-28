import { useAuth } from '@/features/auth/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Wallet,
  Repeat,
  Target,
  TrendingUp,
  CreditCard,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/add', label: 'Add Transaction', icon: PlusCircle },
  { path: '/transactions', label: 'Transactions', icon: List },
  { path: '/categories', label: 'Budgets', icon: Wallet },
  { path: '/recurring', label: 'Recurring', icon: Repeat },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/networth', label: 'Net Worth', icon: TrendingUp },
  { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/compare', label: 'Compare', icon: BarChart3 },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNav = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            ₹
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Finance Tracker</h1>
            <p className="text-xs text-muted-foreground">Money dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4 space-y-2">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
              {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              ₹
            </div>
            <span className="font-semibold text-sm">Finance Tracker</span>
          </div>
          <div className="ml-auto flex gap-1">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-accent text-destructive" aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="flex border-t bg-card lg:hidden">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
