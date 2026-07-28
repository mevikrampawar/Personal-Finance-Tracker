import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  TrendingUp, TrendingDown, Wallet, Target, BarChart3,
  Repeat, CreditCard, ArrowRight, Shield, Zap, Eye,
  ChevronRight, Loader2,
} from 'lucide-react'

function useCountUp(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)
  const rafId = useRef(null)

  useEffect(() => {
    if (!startOnView) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * end))
            if (progress < 1) {
              rafId.current = requestAnimationFrame(step)
            }
          }
          rafId.current = requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [end, duration, startOnView])

  return { count, ref }
}

function TickerTape() {
  const items = [
    { label: 'Savings', value: '+12.4%', up: true },
    { label: 'Net Worth', value: '+₹2.4L', up: true },
    { label: 'Expenses', value: '-8.2%', up: false },
    { label: 'Budget', value: '87% used', up: true },
    { label: 'Subscriptions', value: '₹1,200/mo', up: false },
    { label: 'Goals', value: '3 active', up: true },
    { label: 'Transactions', value: '248 this month', up: true },
    { label: 'Savings Rate', value: '24%', up: true },
  ]

  return (
    <div className="relative overflow-hidden border-b bg-card/50 backdrop-blur-sm">
      <div className="flex animate-ticker whitespace-nowrap py-2">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-2 text-xs font-medium">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={item.up ? 'text-income' : 'text-expense'}>
              {item.up ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
              {' '}{item.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function CandlestickChart() {
  const candles = useMemo(() => {
    const data = []
    let price = 100
    for (let i = 0; i < 40; i++) {
      const change = (Math.random() - 0.45) * 12
      const open = price
      const close = price + change
      const high = Math.max(open, close) + Math.random() * 6
      const low = Math.min(open, close) - Math.random() * 6
      data.push({ open, close, high, low })
      price = close
    }
    return data
  }, [])

  const allPrices = candles.flatMap((c) => [c.high, c.low])
  const min = Math.min(...allPrices)
  const max = Math.max(...allPrices)
  const range = max - min || 1

  const w = 800
  const h = 200
  const candleW = w / candles.length

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-income)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-income)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-income)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--color-income)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {candles.map((c, i) => {
        const x = i * candleW + candleW * 0.2
        const cw = candleW * 0.6
        const bullish = c.close >= c.open
        const top = Math.max(c.open, c.close)
        const bot = Math.min(c.open, c.close)
        const bodyH = Math.max(((top - bot) / range) * h, 1)
        const yBody = h - ((top - min) / range) * h
        const yHigh = h - ((c.high - min) / range) * h
        const yLow = h - ((c.low - min) / range) * h
        return (
          <g key={i}>
            <line x1={x + cw / 2} y1={yHigh} x2={x + cw / 2} y2={yLow} stroke={bullish ? 'var(--color-income)' : 'var(--color-expense)'} strokeWidth="1" opacity="0.4" />
            <rect x={x} y={yBody} width={cw} height={bodyH} rx="1" fill={bullish ? 'var(--color-income)' : 'var(--color-expense)'} opacity={bullish ? 0.7 : 0.6} />
          </g>
        )
      })}
      <path
        d={`M ${candles.map((c, i) => {
          const x = i * candleW + candleW / 2
          const y = h - ((c.close - min) / range) * h
          return `${x} ${y}`
        }).join(' L ')} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#areaGrad)"
      />
    </svg>
  )
}

function FeatureCard({ icon: Icon, title, desc, color }) {
  return (
    <div className="group rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  )
}

function StatBlock({ label, value, suffix, ref }) {
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-bold tabular-nums text-primary sm:text-4xl">
        {value.toLocaleString('en-IN')}{suffix}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function Nav({ onLogin }) {
  const [scrolled, setScrolled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleClick = useCallback(async () => {
    setLoading(true)
    await onLogin()
    setLoading(false)
  }, [onLogin])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b shadow-sm' : ''}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            ₹
          </div>
          <span className="font-semibold text-sm sm:text-base">Finance Tracker</span>
        </div>
        <Button onClick={handleClick} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </div>
    </header>
  )
}

export default function LandingPage() {
  const { signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const stats = [
    { label: 'Active Users', value: 2400, suffix: '+' },
    { label: 'Transactions Tracked', value: 180000, suffix: '+' },
    { label: 'Total Saved', value: 42, suffix: 'L+' },
    { label: 'Goals Achieved', value: 890, suffix: '+' },
  ]

  const count1 = useCountUp(stats[0].value)
  const count2 = useCountUp(stats[1].value)
  const count3 = useCountUp(stats[2].value)
  const count4 = useCountUp(stats[3].value)
  const counts = [count1, count2, count3, count4]

  const features = [
    { icon: BarChart3, title: 'Smart Dashboard', desc: 'Real-time overview of income, expenses, and balance with category breakdowns and spending insights.', color: 'bg-primary/10 text-primary' },
    { icon: Wallet, title: 'Budget Management', desc: 'Set monthly budgets per category. Visual progress bars show where your money goes.', color: 'bg-blue-500/10 text-blue-500' },
    { icon: Target, title: 'Savings Goals', desc: 'Create targets, track contributions, and celebrate milestones as you hit each goal.', color: 'bg-purple-500/10 text-purple-500' },
    { icon: TrendingUp, title: 'Net Worth Tracking', desc: 'Log assets and liabilities. Watch your net worth grow over time.', color: 'bg-income/10 text-income' },
    { icon: Repeat, title: 'Recurring Entries', desc: 'Set up salary, rent, and subscriptions once — apply them each month with one tap.', color: 'bg-amber-500/10 text-amber-500' },
    { icon: CreditCard, title: 'Subscription Audit', desc: 'See exactly how much you spend on recurring bills and subscriptions every month.', color: 'bg-rose-500/10 text-rose-500' },
    { icon: Eye, title: 'Spending Insights', desc: 'AI-powered rules detect overspending, category spikes, and savings opportunities.', color: 'bg-cyan-500/10 text-cyan-500' },
    { icon: Shield, title: 'Secure & Private', desc: 'Your data lives in your personal Firebase vault. We never see or sell your information.', color: 'bg-emerald-500/10 text-emerald-500' },
  ]

  const handleLogin = useCallback(async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/')
    } catch {
      setLoading(false)
    }
  }, [signInWithGoogle, navigate])

  return (
    <div className="min-h-screen bg-background">
      <Nav onLogin={handleLogin} />
      <TickerTape />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="absolute inset-0 opacity-20 dark:opacity-10">
          <CandlestickChart />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <Zap className="h-3 w-3 text-primary" />
              Built for the modern Indian investor
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your money.<br />
              <span className="text-primary">Crystal clear.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Track every rupee. Set budgets that actually work. Watch your net worth grow.
              The personal finance app that thinks like a portfolio dashboard.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                onClick={handleLogin}
                disabled={loading}
                size="lg"
                className="w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Get Started Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" data-icon="inline-end" />
                  </>
                )}
              </Button>
              <a
                href="#features"
                className="flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground sm:w-auto"
              >
                See Features
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((s, i) => (
              <StatBlock key={s.label} label={s.label} value={counts[i].count} suffix={s.suffix} ref={counts[i].ref} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              From daily tracking to long-term wealth building — all in one place.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center shadow-xl shadow-primary/20 sm:px-12">
            <div className="absolute inset-0 opacity-10">
              <CandlestickChart />
            </div>
            <div className="relative">
              <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">Start tracking your wealth today</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/80">
                Free. No credit card. Your financial clarity is one sign-in away.
              </p>
              <Button
                onClick={handleLogin}
                disabled={loading}
                variant="secondary"
                size="lg"
                className="mt-8 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign in with Google
                    <ArrowRight className="h-4 w-4" data-icon="inline-end" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-[10px]">
              ₹
            </div>
            <span className="text-sm text-muted-foreground">Finance Tracker</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>INR · Made in India</span>
            <a
              href="https://github.com/mevikrampawar/Personal-Finance-Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
