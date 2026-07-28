# AGENTS.md — Personal Finance Tracker v2.0

## Quick Facts

- **Stack**: React 19, Vite 8, Tailwind CSS v4, shadcn/ui (base-nova style), Firebase 12
- **Build**: `npm run dev` (dev), `npm run build` (production), `npm run preview` (preview build)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com) with Base UI primitives (`@base-ui/react`)
- **Deployment**: GitHub Pages — auto-deployed via `.github/workflows/deploy.yml` on push to `main`
- **PWA**: Service worker with stale-while-revalidate caching, Web manifest for installability

## Project Structure

```
/
├── index.html                        # Vite entry HTML
├── package.json                      # npm config — React 19, Vite 8, Firebase 12, shadcn
├── vite.config.js                    # Vite config — React plugin, Tailwind, code splitting
├── components.json                   # shadcn/ui config
├── jsconfig.json                     # Path alias: @/ -> src/
├── public/
│   ├── favicon.svg                   # Rupee symbol favicon
│   ├── manifest.json                 # PWA manifest
│   └── sw.js                         # Service worker (stale-while-revalidate)
├── src/
│   ├── main.jsx                      # React entry point
│   ├── styles/globals.css            # Tailwind v4 + shadcn theme tokens
│   ├── lib/
│   │   ├── firebase.js               # Firebase init (auth, db, analytics)
│   │   ├── utils.js                  # cn() utility (clsx + tailwind-merge)
│   │   ├── currency.js               # INR formatting (Intl.NumberFormat)
│   │   ├── date.js                   # date-fns wrappers
│   │   └── csv.js                    # CSV export with injection protection
│   ├── hooks/
│   │   ├── useFirestore.js           # Generic real-time Firestore collection CRUD
│   │   └── useTheme.js               # Dark/light theme toggle (localStorage)
│   ├── app/
│   │   ├── App.jsx                   # HashRouter, lazy routes, auth guards
│   │   ├── providers.jsx             # Sonner toast + AlertDialog confirm + TooltipProvider
│   │   └── layouts/
│   │       └── DashboardLayout.jsx   # Responsive layout — desktop sidebar, mobile Sheet + bottom nav
│   ├── components/ui/                # shadcn/ui components (22 components)
│   │   ├── button.jsx, card.jsx, input.jsx, select.jsx, ...
│   │   ├── alert-dialog.jsx, dialog.jsx, sheet.jsx
│   │   ├── badge.jsx, avatar.jsx, dropdown-menu.jsx, tooltip.jsx
│   │   ├── tabs.jsx, toggle-group.jsx, input-group.jsx
│   │   ├── table.jsx, progress.jsx, skeleton.jsx, separator.jsx
│   │   ├── popover.jsx, calendar.jsx, command.jsx
│   │   ├── textarea.jsx, toggle.jsx
│   └── features/
│       ├── auth/
│       │   ├── AuthProvider.jsx       # Firebase onAuthStateChanged + Google sign-in
│       │   └── LoginPage.jsx          # Google sign-in with shadcn Card + Button
│       ├── landing/
│       │   └── LandingPage.jsx        # Marketing page — candlestick SVG, ticker, stats, features
│       ├── dashboard/
│       │   ├── OverviewPage.jsx       # Month picker, summary cards, quick actions, widgets
│       │   ├── BudgetProgress.jsx     # Category budget vs spent progress bars
│       │   ├── CategoryBreakdown.jsx  # Expense breakdown bars by category
│       │   ├── SpendingInsights.jsx   # Rule-based spending analysis
│       │   └── MonthlyComparisonPage.jsx # Side-by-side month comparison
│       ├── transactions/
│       │   ├── TransactionsPage.jsx   # Filterable transaction ledger with CSV export
│       │   ├── TransactionFormPage.jsx # Add/edit transaction form
│       │   └── CalendarView.jsx       # Monthly calendar grid with day details
│       ├── categories/
│       │   └── CategoriesPage.jsx     # Category management + budget setting
│       ├── recurring/
│       │   └── RecurringPage.jsx      # Recurring transaction templates + batch apply
│       ├── goals/
│       │   └── GoalsPage.jsx          # Savings goals with progress tracking
│       ├── networth/
│       │   └── NetWorthPage.jsx       # Assets, liabilities, net worth calculation
│       └── subscriptions/
│           └── SubscriptionsPage.jsx  # Subscription tracker with monthly cost
```

## Routing (hash-based)

| Route | Page | Auth Required |
|-------|------|---------------|
| `#/` | Landing page | No |
| `#/login` | Login page | No |
| `#/app` | Dashboard overview | Yes |
| `#/app/add` | Add/edit transaction | Yes |
| `#/app/transactions` | Transaction list | Yes |
| `#/app/categories` | Budget management | Yes |
| `#/app/recurring` | Recurring transactions | Yes |
| `#/app/goals` | Savings goals | Yes |
| `#/app/networth` | Net worth tracker | Yes |
| `#/app/subscriptions` | Subscription tracker | Yes |
| `#/app/compare` | Monthly comparison | Yes |

All routes are lazy-loaded with `React.lazy()` for code splitting.

## Firebase

- **Project**: `personal-finance-tracker-babac`
- **Config**: `src/lib/firebase.js`
- **Auth**: Google sign-in via popup
- **Firestore collections**: `users/{uid}/{transactions|categories|recurringTransactions|goals|assets|liabilities|subscriptions}`
- **Data**: All reads use `onSnapshot` real-time listeners

## Development Conventions

- **No TypeScript** — pure JSX/JS with ES modules
- **No tests or linting** configured
- **shadcn/ui** — use existing shadcn components before custom markup. 22 components available in `src/components/ui/`
- **cn() utility**: `import { cn } from "@/lib/utils"` for conditional classes
- **Toasts**: `import { toast } from "sonner"` — use `toast.success()`, `toast.error()`, `toast.warning()`
- **Confirm dialogs**: `import { useConfirmCtx } from "@/app/providers"` → `await confirm("message?")` returns boolean
- **Icons**: lucide-react (pre-installed), use `data-icon="inline-start|inline-end"` for icons in buttons
- **Currency**: Hardcoded INR (`en-IN` locale) via `src/lib/currency.js`
- **Theme**: Dark/light toggle persisted to localStorage as `finance-theme`

## shadcn/ui Style Notes

- **Base**: `base-nova` (uses `@base-ui/react` primitives, NOT Radix)
- **Tailwind**: v4 with `@theme inline` block for CSS variables
- **Icons**: lucide (`lucide-react`)
- **Font**: Geist Variable (via `@fontsource-variable/geist`)
- **Animation**: `tw-animate-css` for Tailwind v4 animations

## Responsive Design Specification (Mobile-First)

### Touch Targets
- Every interactive element must have minimum **44×44px** touch target
- Use `min-touch` class (`min-h-[44px] min-w-[44px]`) on icon buttons
- Month nav buttons, edit/delete actions, theme/logout toggles, list item delete buttons — all must comply
- Never use `size="icon-xs"` or `size="icon-sm"` — use `size="icon"` with `min-touch` instead

### Hover Effects
- All `hover:` pseudo-classes must be protected with `hoverable:hover:` custom variant
- The `hoverable` variant wraps `@media (hover: hover) and (pointer: fine)` — hover effects only fire on devices that support sustained hover
- The button component (`button.jsx`) has all built-in `hover:` references already converted
- For other inline `hover:` classes (table rows, cards), always prefix with `hoverable:hover:`
- Add `active:scale-[0.97]` or `active:bg-*` as mobile feedback mechanism where appropriate

### Safe Areas
- **Bottom**: `.safe-bottom` class on bottom nav — uses `env(safe-area-inset-bottom)`
- **Top**: `.safe-top` class on mobile header — uses `env(safe-area-inset-top)`
- Always apply both to elements pinned to screen edges on mobile (`lg:hidden`)

### Tap Highlight
- Browser default `-webkit-tap-highlight-color` is suppressed globally (`transparent`)
- Do not re-enable tap highlights on interactive elements

### Bottom Navigation
- Limited to **5 primary items**: Home, Transactions, Add (FAB), Budgets, More
- Add transaction is a **centered FAB button** (circular, primary color, elevated with shadow)
- "More" opens the Sheet sidebar with all navigation items
- Each item minimum **56px height** (h-14) or **48px** (h-12)
- Remaining routes (Recurring, Goals, Net Worth, Subscriptions, Compare, Calendar) live in the Sheet sidebar

### Input Modes
- All currency/number amount inputs must use both `type="number"` AND `inputMode="decimal"`
- This triggers the numeric keyboard with decimal point on mobile while keeping number validation

### Toast Notifications
- Use `position="bottom-center"` for the Sonner `<Toaster>` — works well on all screen sizes

### Desktop Responsiveness
- Use `xl:` and `2xl:` breakpoints for wide screens > 1280px where layout feels sparse
- Already uses `max-w-6xl` content boundary — good for readability on large screens
