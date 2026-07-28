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
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { path: '/app', label: 'Overview', icon: LayoutDashboard },
  { path: '/app/add', label: 'Add Transaction', icon: PlusCircle },
  { path: '/app/transactions', label: 'Transactions', icon: List },
  { path: '/app/categories', label: 'Budgets', icon: Wallet },
  { path: '/app/recurring', label: 'Recurring', icon: Repeat },
  { path: '/app/goals', label: 'Goals', icon: Target },
  { path: '/app/networth', label: 'Net Worth', icon: TrendingUp },
  { path: '/app/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/app/compare', label: 'Compare', icon: BarChart3 },
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
    try {
      await signOut()
      navigate('/')
    } catch {
      navigate('/')
    }
  }

  const isActive = (path) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            ₹
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Finance Tracker</h1>
            <p className="text-xs text-muted-foreground">Money dashboard</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Button>
          ))}
        </nav>

        <Separator />

        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2">
                <Avatar size="sm">
                  {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
                  <AvatarFallback>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate leading-tight">{user?.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open sidebar">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="border-b px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    ₹
                  </div>
                  <SheetTitle className="text-sm">Finance Tracker</SheetTitle>
                </div>
              </SheetHeader>
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleNav(item.path)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Button>
                ))}
              </nav>
              <Separator />
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <Avatar size="sm">
                    {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
                    <AvatarFallback>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={toggleTheme} className="flex-1">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-1 text-destructive">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              ₹
            </div>
            <span className="font-semibold text-sm">Finance Tracker</span>
          </div>

          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="flex overflow-x-auto border-t bg-card lg:hidden safe-bottom">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 h-auto text-[10px] font-medium rounded-none',
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Button>
          ))}
        </nav>
      </div>
    </div>
  )
}
