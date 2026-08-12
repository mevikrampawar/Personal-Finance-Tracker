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
  Calendar,
  MoreHorizontal,
  UploadCloud,
  FileText,
} from 'lucide-react'
import { useState } from 'react'
import { useConfirmCtx } from '@/app/providers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

const FULL_NAV_ITEMS = [
  { path: '/app', label: 'Overview', icon: LayoutDashboard },
  { path: '/app/add', label: 'Add Transaction', icon: PlusCircle },
  { path: '/app/transactions', label: 'Transactions', icon: List },
  { path: '/app/categories', label: 'Budgets', icon: Wallet },
  { path: '/app/recurring', label: 'Recurring', icon: Repeat },
  { path: '/app/goals', label: 'Goals', icon: Target },
  { path: '/app/networth', label: 'Net Worth', icon: TrendingUp },
  { path: '/app/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/app/compare', label: 'Compare', icon: BarChart3 },
  { path: '/app/calendar', label: 'Calendar', icon: Calendar },
  { path: '/app/import', label: 'Import', icon: UploadCloud },
  { path: '/app/reports', label: 'Reports', icon: FileText },
]

const BOTTOM_NAV = [
  { path: '/app', label: 'Home', icon: LayoutDashboard },
  { path: '/app/transactions', label: 'Transactions', icon: List },
  null,
  { path: '/app/categories', label: 'Budgets', icon: Wallet },
  { path: '#more', label: 'More', icon: MoreHorizontal },
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

  const { confirm } = useConfirmCtx()

  const handleLogout = async () => {
    const ok = await confirm('Are you sure you want to log out?')
    if (!ok) return
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
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            ₹
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Finance Tracker</h1>
            <p className="text-xs text-muted-foreground">Money dashboard</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {FULL_NAV_ITEMS.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? 'secondary' : 'ghost'}
              className="w-full justify-start h-11"
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Button>
          ))}
        </nav>

        <Separator />

        <div className="p-4 space-y-1">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hoverable:hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer">
                <Avatar size="sm">
                  {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
                  <AvatarFallback className="text-xs">{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{user?.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate leading-tight">{user?.email}</p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Account Details</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-4 py-4">
                <Avatar className="h-14 w-14">
                  {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
                  <AvatarFallback className="text-lg">{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-semibold text-base">{user?.displayName || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground/60">Signed in via Google</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="pt-2 space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar - fixed */}
        <header className="shrink-0 flex h-14 items-center gap-3 border-b bg-card px-4 safe-top lg:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="min-touch" aria-label="Open sidebar">
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
                {FULL_NAV_ITEMS.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? 'secondary' : 'ghost'}
                    className="w-full justify-start h-11"
                    onClick={() => handleNav(item.path)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Button>
                ))}
              </nav>
              <Separator />
              <div className="p-4 space-y-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex w-full items-center gap-3 cursor-pointer">
                      <Avatar>
                        {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
                        <AvatarFallback>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Account Details</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-4 py-4">
                      <Avatar className="h-14 w-14">
                        {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
                        <AvatarFallback className="text-lg">{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="font-semibold text-base">{user?.displayName || 'User'}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                        <p className="text-xs text-muted-foreground/60">Signed in via Google</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={toggleTheme} className="h-11">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                  <Button variant="outline" onClick={handleLogout} className="h-11 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                    Sign Out
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
            <Button variant="ghost" size="icon" className="min-touch" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="min-touch" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </header>

        {/* Page content - scrollable */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav - fixed */}
        <nav
          className="shrink-0 flex items-center justify-around border-t bg-card lg:hidden safe-bottom"
          style={{ height: 'calc(56px + env(safe-area-inset-bottom))' }}
        >
          {BOTTOM_NAV.map((item, i) => {
            if (item === null) {
              return (
                <Button
                  key="add"
                  variant="default"
                  onClick={() => navigate('/app/add')}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full p-0 shadow-lg shadow-primary/30 -mt-4"
                  aria-label="Add transaction"
                >
                  <PlusCircle className="h-6 w-6" />
                </Button>
              )
            }
            if (item.path === '#more') {
              return (
                <Button
                  key="more"
                  variant="ghost"
                  onClick={() => setSidebarOpen(true)}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-center gap-0.5 h-14 rounded-none text-[10px] font-medium',
                    'text-muted-foreground',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="leading-tight">{item.label}</span>
                </Button>
              )
            }
            return (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 h-14 rounded-none text-[10px] font-medium active:scale-[0.97]',
                  isActive(item.path) ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {isActive(item.path) && (
                  <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary" />
                )}
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="leading-tight">{item.label}</span>
              </Button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
