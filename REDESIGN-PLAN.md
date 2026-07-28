# Personal Finance Tracker — Full Redesign Plan

## Executive Summary

Complete rewrite from vanilla JS to **React + Vite + Tailwind CSS + shadcn/ui**, migrating from a flat static site to a modern SPA with component architecture. All existing features preserved and optimized, plus major new features inspired by leading apps (Monarch Money, YNAB, Copilot Money, PocketGuard).

**Core Principles Preserved:**
- Firebase Auth (Google sign-in) + Firestore real-time data
- INR currency, mobile-native approach
- Security-first (DOM-based rendering, no XSS vectors)
- Smooth transitions and animations

---

## Phase 1: Project Foundation & Tooling

### 1.1 Initialize React + Vite Project
- `npm create vite@latest . -- --template react`
- Install Tailwind CSS v4 + PostCSS
- Install and configure shadcn/ui (`npx shadcn@latest init`)
- Set up path aliases (`@/` → `src/`)

### 1.2 Project Structure
```
src/
├── app/                    # App shell, routing, layout
│   ├── App.jsx
│   ├── Router.jsx
│   └── layouts/
│       ├── AuthLayout.jsx      # Login page layout
│       └── DashboardLayout.jsx # Sidebar + content shell
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui components (auto-generated)
│   ├── charts/             # Custom chart components
│   │   ├── IncomeExpenseChart.jsx
│   │   ├── CategoryDonutChart.jsx
│   │   └── TrendLineChart.jsx
│   ├── calendar/
│   │   └── CalendarGrid.jsx
│   └── shared/
│       ├── CurrencyDisplay.jsx
│       ├── EmptyState.jsx
│       └── ConfirmDialog.jsx
├── features/               # Feature modules (colocated)
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   └── useAuth.js          # Auth hook
│   ├── dashboard/
│   │   ├── OverviewPage.jsx
│   │   ├── SummaryCards.jsx
│   │   ├── ExpenseBreakdown.jsx
│   │   ├── BudgetProgress.jsx
│   │   └── SpendingVelocity.jsx
│   ├── transactions/
│   │   ├── TransactionsPage.jsx
│   │   ├── TransactionForm.jsx
│   │   ├── TransactionTable.jsx
│   │   ├── TransactionFilters.jsx
│   │   └── useTransactions.js
│   ├── categories/
│   │   ├── CategoriesPage.jsx
│   │   ├── CategoryList.jsx
│   │   ├── BudgetEditor.jsx
│   │   └── useCategories.js
│   ├── recurring/
│   │   ├── RecurringPage.jsx
│   │   ├── RecurringForm.jsx
│   │   ├── RecurringList.jsx
│   │   └── useRecurring.js
│   ├── goals/              # NEW
│   │   ├── GoalsPage.jsx
│   │   ├── GoalCard.jsx
│   │   ├── GoalForm.jsx
│   │   └── useGoals.js
│   ├── networth/           # NEW
│   │   ├── NetWorthPage.jsx
│   │   ├── AssetLiabilityForm.jsx
│   │   └── useNetWorth.js
│   └── subscriptions/      # NEW
│       ├── SubscriptionsPage.jsx
│       └── useSubscriptions.js
├── hooks/                  # Custom React hooks
│   ├── useFirestore.js     # Generic Firestore CRUD
│   ├── useTheme.js
│   └── useMediaQuery.js
├── lib/                    # Utilities
│   ├── firebase.js         # Firebase config + init
│   ├── currency.js         # INR formatting
│   ├── date.js             # Date helpers
│   ├── csv.js              # CSV export
│   └── cn.js               # Tailwind class merge
├── styles/
│   └── globals.css         # Tailwind base + shadcn theme
└── main.jsx                # Entry point
public/
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── icons/                  # PWA icons (192, 512)
└── favicon.ico
```

### 1.3 Firebase Migration
- Move `firebase-config.js` → `src/lib/firebase.js`
- Keep Firebase SDK version 9.23 (modular imports)
- Create Firestore hooks: `useFirestore` for generic CRUD, real-time listeners
- Preserve existing Firestore document structure (users/{uid}/transactions, etc.)

---

## Phase 2: Existing Features — Optimized & Modernized

### 2.1 Authentication
**Current:** Vanilla JS `signInWithPopup` → redirect
**New:**
- React context provider (`AuthProvider`)
- `useAuth()` hook exposing `user`, `loading`, `signInWithGoogle`, `signOut`
- Protected route wrapper component
- Loading skeleton while auth state resolves

### 2.2 Dashboard (Overview)
**Current:** Manual DOM rendering, canvas charts
**New:**
- **shadcn Card** components for summary cards (Income, Expenses, Balance)
- **recharts** (shadcn's recommended charting lib) for:
  - Income vs Expenses bar chart
  - Category donut/pie chart
  - Monthly trend line chart (6-month history)
- **Spending Velocity** widget: "You're spending ₹X/day this month" with pace indicator
- **Leftover Money** calculation: Income − Bills − Goals = Available
- Month picker with animated transitions
- Skeleton loading states during data fetch

### 2.3 Transaction Management
**Current:** Table with inline edit/delete, basic filters
**New:**
- **shadcn DataTable** with sortable columns, pagination
- **shadcn Sheet** (slide-out panel) for quick-add transaction
- **shadcn Command** for command-palette search (⌘K)
- **shadcn Tabs** for switching between Month/Date/All views
- **shadcn Select** + **shadcn ToggleGroup** for filter controls
- Inline editing via **shadcn Popover**
- Swipe-to-delete on mobile (native touch gesture)
- **Tags system**: Add tags to transactions (e.g., "travel", "work")
- **Notes field**: Optional note per transaction
- Bulk select + bulk delete
- Improved CSV export with more columns

### 2.4 Categories & Budgets
**Current:** Simple list, budget inputs
**New:**
- **shadcn Table** for category list with budget, spent, remaining columns
- **shadcn Progress** bars for budget utilization (color-coded: green/yellow/red)
- Category icons (emoji or lucide icon picker)
- Budget rollover option (carry unused budget to next month)
- Category-level spending trends (sparkline chart per category)

### 2.5 Recurring Transactions
**Current:** Basic form + list
**New:**
- **shadcn Card** grid for recurring templates
- "Apply for month" becomes a **shadcn AlertDialog** confirmation
- Visual indicator: which months have been applied
- Upcoming recurring preview ("Next: ₹5,000 rent on Aug 1")
- Auto-apply option (optional, requires confirmation)

### 2.6 Calendar View
**Current:** Custom canvas calendar
**New:**
- **shadcn Calendar** component (built on React DayPicker)
- Transaction count badges on dates
- Click date → slide-in transaction list (**shadcn Sheet**)
- Month navigation with **shadcn Button** group

---

## Phase 3: New Features (Based on Research)

### 3.1 Savings Goals ⭐ HIGH PRIORITY
*Inspired by: YNAB goals, Copilot savings, Monarch goals*
- Create named goals (e.g., "Emergency Fund", "Vacation", "New Laptop")
- Set target amount + target date
- **shadcn Progress** bar showing % complete
- Quick-add contribution from any income
- Goal milestones (25%, 50%, 75%, 100%) with celebration animation
- Firestore: `users/{uid}/goals` collection

### 3.2 Net Worth Tracking ⭐ HIGH PRIORITY
*Inspired by: Monarch, Empower, PocketGuard*
- Manual entry of assets (bank accounts, investments, property, cash)
- Manual entry of liabilities (loans, credit cards, EMIs)
- Net Worth = Assets − Liabilities
- Historical tracking with trend chart
- Monthly snapshots stored automatically
- Firestore: `users/{uid}/netWorth` collection

### 3.3 Subscription & Bill Tracker ⭐ MEDIUM PRIORITY
*Inspired by: Rocket Money, PocketGuard*
- Track recurring bills (rent, electricity, internet, subscriptions)
- Due date alerts (visual indicator on dashboard)
- Monthly/annual cost summary
- "Subscription audit" — total monthly recurring cost
- Link to recurring transactions (auto-detect)

### 3.4 Spending Insights ⭐ MEDIUM PRIORITY
*Inspired by: Copilot, Avenue*
- **Rules-based insights** (no AI API needed):
  - "You spent 30% more on Dining this month vs last month"
  - "Your Grocery spending is above your ₹5,000 budget"
  - "You have 3 subscriptions totaling ₹1,200/month"
  - "Today is the 15th — you've used 60% of your monthly budget"
- **Pace tracker**: "At current rate, you'll exceed your budget by ₹X"
- Weekly summary card (can be viewed, not push notification)

### 3.5 Monthly Comparison
*Inspired by: YNAB, Monarch*
- Side-by-side month comparison
- "% change" indicators for income, expenses, category totals
- "Best month" / "Worst month" highlights

### 3.6 PWA (Progressive Web App) ⭐ HIGH PRIORITY
*Inspired by: finance-tracker PWA examples*
- `manifest.json` with app name, icons, theme color, display: standalone
- Service worker for offline caching (app shell + recent data)
- Install prompt banner on mobile
- Offline fallback page
- Background sync for pending writes

### 3.7 Improved Onboarding
- First-time user welcome screen
- Step-by-step setup: "Add your first category" → "Set a budget" → "Record a transaction"
- Default categories pre-seeded (matching current: Personal, Education, Grocery + common ones)
- Tooltip walkthrough for key features

### 3.8 Multi-Currency Support (Future)
- Allow users to set currency in settings
- Currency selector in onboarding
- All formatting updates automatically
- Default remains INR

---

## Phase 4: Design System (shadcn/ui Theme)

### 4.1 Color Palette
Adapt shadcn's default palette with a finance-app feel:
- **Primary**: Emerald green (#10b981) — money, growth, positive
- **Destructive**: Rose (#f43f5e) — expenses, alerts
- **Warning**: Amber (#f59e0b) — budget warnings
- **Muted**: Slate gray — secondary text
- **Background**: Near-white (#fafafa) light / Near-black (#0a0a0a) dark

### 4.2 Typography
- **Headings**: Inter or Geist (system font stack)
- **Monospace numbers**: Tabular numerals for financial figures (crucial for alignment)
- **Currency**: Always display with ₹ symbol, 2 decimal places, locale-formatted

### 4.3 Component Mapping
| Current Pattern | shadcn/ui Component |
|---|---|
| Custom toast | `<Toast>` + `<Toaster>` |
| Custom confirm dialog | `<AlertDialog>` |
| Transaction table | `<Table>` or `<DataTable>` |
| Form inputs | `<Input>`, `<Select>`, `<RadioGroup>` |
| Category cards | `<Card>` |
| Budget progress bars | `<Progress>` |
| Filter toggles | `<ToggleGroup>` or `<Tabs>` |
| Month picker | `<Calendar>` or custom `<DatePicker>` |
| Sidebar navigation | `<Sidebar>` component |
| Modal/slide-out | `<Sheet>` (mobile) / `<Dialog>` (desktop) |
| Dropdown menus | `<DropdownMenu>` |
| Tooltips | `<Tooltip>` |
| Badges (income/expense) | `<Badge>` |

### 4.4 Animations & Transitions
- Page transitions: `framer-motion` (AnimatePresence)
- Number counters: Animated count-up for totals
- Skeleton loaders: `<Skeleton>` during data fetch
- Micro-interactions: Button hover scales, card hover lifts
- Calendar day selection: Smooth highlight transition

---

## Phase 5: Security & Performance

### 5.1 Security (Preserved + Enhanced)
- All user data under `users/{uid}/` Firestore paths (existing)
- Firebase Security Rules: Only authenticated users can read/write their own data
- No `innerHTML` — all React rendering is XSS-safe by default
- CSP headers configured for deployment
- Firebase config: API key is public (expected), but Firestore rules enforce access
- No secrets in client code

### 5.2 Performance
- **Code splitting**: Route-based lazy loading (`React.lazy`)
- **Virtual scrolling**: For large transaction lists (react-window if needed)
- **Image optimization**: PWA icons in multiple sizes
- **Bundle analysis**: Check bundle size with `vite-plugin-visualizer`
- **Lighthouse target**: 90+ on all categories
- **Core Web Vitals**: LCP < 2.5s, INP < 200ms, CLS < 0.1

### 5.3 Offline Support
- Service worker caches app shell (HTML, CSS, JS, icons)
- Firestore offline persistence enabled (`enableMultiTabIndexedDbPersistence`)
- Queue writes when offline, sync when back online
- Offline indicator banner

---

## Phase 6: Deployment

### 6.1 Build & Deploy
- `npm run build` → `dist/` folder
- GitHub Pages deployment (same as current)
- Update `vite.config.js`: `base: '/Personal-Finance-Tracker/'`
- Deploy via GitHub Actions or manual push to `gh-pages` branch

### 6.2 Migration Strategy
1. Build new React app in parallel (same repo, different branch)
2. Test all features thoroughly
3. Firebase data is unchanged — no migration needed
4. Swap deployment when ready
5. Keep `AGENTS.md` updated

---

## Build Order (Implementation Sequence)

| Step | What | Est. Time |
|------|------|-----------|
| 1 | Initialize React + Vite + Tailwind + shadcn/ui | Setup |
| 2 | Firebase config + Auth provider + routing | Core |
| 3 | Dashboard layout (sidebar, topbar, pages) | Layout |
| 4 | Transaction CRUD (form, table, filters) | Core |
| 5 | Categories & budgets | Core |
| 6 | Recurring transactions | Core |
| 7 | Dashboard overview (cards, charts) | Polish |
| 8 | Calendar view | Polish |
| 9 | CSV export | Utility |
| 10 | Dark/light mode | Theme |
| 11 | Savings goals | New |
| 12 | Net worth tracking | New |
| 13 | Subscription tracker | New |
| 14 | Spending insights | New |
| 15 | Monthly comparison | New |
| 16 | PWA (manifest + service worker) | Infra |
| 17 | Onboarding flow | UX |
| 18 | Animations & polish | Polish |
| 19 | Performance audit + Lighthouse | QA |
| 20 | Deploy to GitHub Pages | Ship |

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React 19 | Modern, huge ecosystem, shadcn native |
| Build tool | Vite | Fast, simple, great DX |
| Styling | Tailwind CSS v4 | shadcn/ui requires it, utility-first |
| Components | shadcn/ui | Accessible, customizable, no vendor lock-in |
| Charts | recharts | shadcn's recommended, composable |
| Animation | framer-motion | Page transitions, micro-interactions |
| Forms | react-hook-form + zod | Validation, type safety |
| Firebase | 9.23 (existing) | No version change needed, modular |
| State | React context + hooks | No need for Redux/Zustand at this scale |
| Date handling | date-fns | Lightweight, tree-shakeable |
| PWA | Workbox (via Vite plugin) | Standard service worker tooling |
