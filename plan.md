# Personal Finance Tracker — Complete Rebuild Plan

## Overview

Complete React + Vite + Tailwind CSS + Firebase rebuild from scratch. Covers all existing features plus new features from the previous redesign (Goals, Net Worth, Subscriptions, Monthly Comparison, Spending Insights).

**Stack:**
- React 19, Vite 8, Tailwind CSS v4
- Firebase 12 (Auth + Firestore)
- react-router-dom v7 (hash routing)
- date-fns, lucide-react, recharts, framer-motion
- clsx + tailwind-merge (cn utility)
- GitHub Pages deployment

---

## Project Structure (40 files)

```
/
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
├── .github/workflows/deploy.yml
├── AGENTS.md
├── public/
│   ├── favicon.svg
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── main.jsx
│   ├── styles/
│   │   └── globals.css
│   ├── lib/
│   │   ├── firebase.js
│   │   ├── cn.js
│   │   ├── currency.js
│   │   ├── date.js
│   │   └── csv.js
│   ├── hooks/
│   │   ├── useFirestore.js
│   │   ├── useTheme.js
│   │   └── useToast.js
│   ├── app/
│   │   ├── App.jsx
│   │   ├── providers.jsx
│   │   └── layouts/
│   │       └── DashboardLayout.jsx
│   ├── components/
│   │   └── ui/
│   │       ├── Toast.jsx
│   │       └── ConfirmDialog.jsx
│   └── features/
│       ├── auth/
│       │   ├── AuthProvider.jsx
│       │   └── LoginPage.jsx
│       ├── landing/
│       │   └── LandingPage.jsx
│       ├── dashboard/
│       │   ├── OverviewPage.jsx
│       │   ├── BudgetProgress.jsx
│       │   ├── CategoryBreakdown.jsx
│       │   ├── SpendingInsights.jsx
│       │   └── MonthlyComparisonPage.jsx
│       ├── transactions/
│       │   ├── TransactionsPage.jsx
│       │   ├── TransactionFormPage.jsx
│       │   └── CalendarView.jsx
│       ├── categories/
│       │   └── CategoriesPage.jsx
│       ├── recurring/
│       │   └── RecurringPage.jsx
│       ├── goals/
│       │   └── GoalsPage.jsx (NEW)
│       ├── networth/
│       │   └── NetWorthPage.jsx (NEW)
│       └── subscriptions/
│           └── SubscriptionsPage.jsx (NEW)
```

---

## Build Order (20 Steps)

| # | Step | Key Files | Description |
|---|------|-----------|-------------|
| 1 | **Scaffold** | `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `globals.css`, `main.jsx` | Vite + React + Tailwind v4 init, path alias `@/`, theme tokens, Firebase chunk splitting |
| 2 | **Firebase + Auth** | `lib/firebase.js`, `AuthProvider.jsx`, `LoginPage.jsx` | Firebase init, Google sign-in, `onAuthStateChanged`, error handling |
| 3 | **Utilities** | `cn.js`, `currency.js`, `date.js`, `csv.js` | INR formatting, date-fns wrappers, CSV export, Tailwind class merge |
| 4 | **App Shell** | `App.jsx`, `DashboardLayout.jsx` | HashRouter, lazy route loading, responsive sidebar + bottom nav |
| 5 | **Toast + Confirm** | `providers.jsx`, `Toast.jsx`, `ConfirmDialog.jsx` | Auto-dismiss toasts, Promise-based confirm dialog |
| 6 | **Hooks** | `useFirestore.js`, `useTheme.js`, `useToast.js` | Generic real-time CRUD, theme persistence |
| 7 | **Transaction Form** | `TransactionFormPage.jsx` | Add/edit mode via `?edit=id`, type/category/date/amount fields |
| 8 | **Transactions List** | `TransactionsPage.jsx` | 6 filters, CSV export, delete with confirm, month picker |
| 9 | **Categories** | `CategoriesPage.jsx` | Add/delete categories, per-category budget, bulk save |
| 10 | **Recurring** | `RecurringPage.jsx` | Day-of-month scheduling, batch apply with dedup |
| 11 | **Dashboard Overview** | `OverviewPage.jsx` | Month picker, 3 summary cards, quick actions |
| 12 | **Dashboard Widgets** | `BudgetProgress.jsx`, `CategoryBreakdown.jsx`, `SpendingInsights.jsx` | Progress bars, breakdown, rule-based insights |
| 13 | **Charts** | (recharts in OverviewPage) | Bar/donut/trend charts |
| 14 | **Calendar View** | `CalendarView.jsx` | Month grid, day transaction badges, click-to-view |
| 15 | **Goals** | `GoalsPage.jsx` | Target amount + progress + contributions + celebration |
| 16 | **Net Worth** | `NetWorthPage.jsx` | Assets vs liabilities, net worth calculation |
| 17 | **Subscriptions** | `SubscriptionsPage.jsx` | Frequency normalization, monthly cost summary |
| 18 | **Monthly Comparison** | `MonthlyComparisonPage.jsx` | Side-by-side months with % change indicators |
| 19 | **PWA + Deploy** | `manifest.json`, `sw.js`, `deploy.yml` | Service worker, manifest, GitHub Actions workflow |
| 20 | **Landing Page + Polish** | `LandingPage.jsx` | Hero section, framer-motion transitions, final polish |

---

## Firestore Collections

| Path | Document Shape |
|------|---------------|
| `users/{uid}/transactions` | `{ description, amount, type, category, createdAt, updatedAt, recurringId?, recurringPeriod? }` |
| `users/{uid}/categories` | `{ name, monthlyBudget, createdAt, updatedAt }` |
| `users/{uid}/recurringTransactions` | `{ description, amount, type, category, dayOfMonth, createdAt }` |
| `users/{uid}/goals` | `{ name, targetAmount, targetDate?, currentAmount }` |
| `users/{uid}/assets` | `{ name, amount, createdAt }` |
| `users/{uid}/liabilities` | `{ name, amount, createdAt }` |
| `users/{uid}/subscriptions` | `{ name, amount, frequency, nextDate?, createdAt }` |

---

## Post-Rebuild: Update AGENTS.md

Replace AGENTS.md to reflect:
- Stack: React 19, Vite 8, Tailwind CSS v4, Firebase 12
- Build system: npm scripts (`dev`/`build`/`preview`)
- All npm-based (no CDN imports)
- Full component tree documentation
