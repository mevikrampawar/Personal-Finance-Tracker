# Bug Fix Plan — Personal Finance Tracker

## Overview

Fix 20 bugs and issues identified in v2.0 codebase audit. Each task is independent and deployable.

## Global Constraints

- No tests or linting configured — implementer verifies via `npm run build` and manual review
- All files are JSX/JS, no TypeScript
- Project uses React 19, Tailwind v4, shadcn/ui (base-nova), Firebase 12
- API keys and Firebase config stay as-is (public-by-design for Firebase Web SDK)
- Do not add new npm dependencies
- Do not change the routing or page structure
- Follow existing code conventions (no comments unless requested, use `cn()` for classes, use lucide-react icons, use toast for notifications)
- CSV injection protection must remain intact

## Phase 1 — Critical (data integrity + crashes)

### Task 1: Add transactionDate field, keep createdAt as system timestamp

**Files:** `src/hooks/useFirestore.js`, `src/features/transactions/TransactionFormPage.jsx`, `src/lib/csv.js`, `src/features/transactions/TransactionsPage.jsx`, `src/features/dashboard/SpendingInsights.jsx`, `src/features/dashboard/MonthlyComparisonPage.jsx`, `src/features/dashboard/OverviewPage.jsx`, `src/features/transactions/CalendarView.jsx`, `src/features/recurring/RecurringPage.jsx`, `src/lib/date.js`, `src/firestore.rules`

**What to do:**
- In `useFirestore.js` `add()`: Change from `{ ...payload, createdAt: new Date(), updatedAt: new Date() }` to preserve `payload.createdAt` as `transactionDate` if present, always set system `createdAt` and `updatedAt`. The field sent should be `transactionDate` (a JS Date), `createdAt` (system timestamp), `updatedAt` (system timestamp). The `add` function signature remains the same but it should NOT override `transactionDate` if present in payload.
- In `TransactionFormPage.jsx`: send `transactionDate` instead of `createdAt` in the payload. The form already has a `date` field — just rename the key to `transactionDate` in the payload object.
- In `csv.js`: Read `t.transactionDate` first, fall back to `t.createdAt` for backward compat.
- In `TransactionsPage.jsx`: Use `t.transactionDate` for date display, fall back to `t.createdAt`.
- In `SpendingInsights.jsx`: Already uses `t.createdAt` — change to `t.transactionDate` with `t.createdAt` fallback.
- In `MonthlyComparisonPage.jsx`: Already uses `t.createdAt` — change to `t.transactionDate` with `t.createdAt` fallback.
- In `OverviewPage.jsx`: Uses `getTransactionsForMonth` from date.js which uses `t.createdAt` — ensure fallback.
- In `CalendarView.jsx`: Same — uses `t.createdAt` for date key grouping.
- In `RecurringPage.jsx` `handleApply`: Sets `createdAt: txDate` — change to `transactionDate: txDate` and let the hook set `createdAt`.
- In `src/lib/date.js`: The filtering helpers (`getTransactionsForMonth`, `getTransactionsForDate`, `toLocalDate`) need to check `transactionDate` first, then `createdAt` as fallback.
- In `src/firestore.rules`: Add `transactionDate` to the allowed fields list in `isValidTransaction()`. The `transactionDate` field is optional (`isValidOptionalString` or just allow it in `hasOnlyAllowedFields`).

### Task 2: Fix Firestore rules — remove createdAtNotSet, add transactionDate validation

**Files:** `src/firestore.rules`

**What to do:**
- Remove `createdAtNotSet()` requirement from all `allow create` rules — the client sets `createdAt` and that's fine.
- Keep `createdAtUnchanged()` on updates (immutable field protection).
- Add `transactionDate is timestamp` validation in `isValidTransaction()` (optional field).
- Ensure all collection validators check `createdAt` is a timestamp (it's always set by the hook with `new Date()` which Firebase SDK serializes to Timestamp).

### Task 3: Add query limits to useFirestore

**Files:** `src/hooks/useFirestore.js`, `src/features/transactions/TransactionsPage.jsx` (and potentially all pages that use the hook)

**What to do:**
- Accept optional `limit` parameter (default 1000) in `useFirestoreCollection`.
- Apply `.limit(limit)` to the Firestore query.
- For pages that need all data (CategoriesPage, GoalsPage, etc.) keep the default high limit.
- For TransactionsPage, pass a limit of 500 (they can filter by month anyway).

### Task 4: Add amount sanitization against NaN and negative

**Files:** `src/features/transactions/TransactionFormPage.jsx`, `src/features/recurring/RecurringPage.jsx`, `src/features/goals/GoalsPage.jsx`, `src/features/networth/NetWorthPage.jsx`, `src/features/subscriptions/SubscriptionsPage.jsx`

**What to do:**
- Create a helper function `sanitizeAmount(value)` in each form that converts to number, checks `isNaN`, checks `> 0`, and returns `{ valid: boolean, value: number }`.
- Standardize amount validation across all feature forms: reject NaN, reject <= 0, reject Infinity.
- Show toast warning for invalid amounts.
- Use `toast.warning` from `sonner` directly (already imported in most files).

## Phase 2 — Functional

### Task 5: Create missing PWA icons

**Files:** `public/icons/` (new directory), icons to create

**What to do:**
- Create `public/icons/` directory.
- This is a no-code task — create placeholder SVG-based icons at `public/icons/icon-192.svg` and `public/icons/icon-512.svg` that render the rupee symbol ₹.
- Update `manifest.json` to reference `.svg` icons since we can't generate PNG.
- Create simple SVG files with ₹ in a green (#10b981) rounded square.

### Task 6: Remove unused imports

**Files:** `src/features/categories/CategoriesPage.jsx`, `src/features/goals/GoalsPage.jsx`, `src/features/recurring/RecurringPage.jsx`

**What to do:**
- In `CategoriesPage.jsx`: Remove the `useConfirmCtx` import (line 5: `import { useToastCtx, useConfirmCtx } from '@/app/providers'` → keep `useToastCtx`, remove `useConfirmCtx`). Also remove the unused `const { confirm } = useConfirmCtx()` invocation (line 18).
- In `GoalsPage.jsx`: Same pattern — remove `useConfirmCtx` import and `const { confirm } = useConfirmCtx()`.
- In `RecurringPage.jsx`: Same pattern — remove `useConfirmCtx` import and `const { confirm } = useConfirmCtx()`.

### Task 7: Fix landing page button hover class

**Files:** `src/features/landing/LandingPage.jsx`

**What to do:**
- Line 278: The `group-hover/button` CSS class on the ArrowRight icon requires the parent Button to have `group/button` class.
- The shadcn Button component might not support arbitrary group names via className.
- Fix: Just remove the `group-hover/button` class and the `transition-transform` class from the ArrowRight icon, since the button hover state isn't applying it anyway. Or wrap the Button content in a `<span className="group/button">`.

### Task 8: Add Firestore composite indexes

**Files:** `firestore.indexes.json`

**What to do:**
- Add composite indexes for all subcollections under `users/{userId}` with `createdAt` DESC (since the query in useFirestore.js uses `orderBy('createdAt', 'desc')` without a where clause, it doesn't need a composite index — single-field indexes suffice).
- Actually, since the queries are `collection(db, 'users', uid, collectionName)` with just `orderBy('createdAt', 'desc')`, this only needs a single-field index which is auto-created.
- Leave indexes empty — no changes needed. The auto-indexing handles single-field orderBy.

### Task 9: Handle CalendarView routing

**Files:** `src/app/App.jsx`, `src/features/transactions/CalendarView.jsx`

**What to do:**
- CalendarView is a fully implemented component but not connected to any route.
- Add a route at `/app/calendar` in App.jsx under the dashboard layout.
- Add a nav item in DashboardLayout.jsx NAV_ITEMS for Calendar.

### Task 10: Fix duplicate recurring apply logic

**Files:** `src/features/recurring/RecurringPage.jsx`

**What to do:**
- The dedup check (lines 63-66) uses `recurringId` + `recurringPeriod`. 
- If a user deletes a recurring template and recreates it (new `id`), applying creates duplicates for the same month.
- Fix: No changes needed — this is a design choice. The `recurringId` links back to the specific template document, so a new template correctly creates new entries. Document this as intentional.

## Phase 3 — Security + Code Quality

### Task 11: Add Firestore rule validations for amount and createdAt

**Files:** `firestore.rules`

**What to do:**
- In `isValidTransaction()`: Ensure `createdAt is timestamp` check is present.
- Add `transactionDate` to `hasOnlyAllowedFields` if not already present from Task 1.
- For all validators: add `createdAt is timestamp` check.
- For asset/liability/subscription: add `isPositiveNumber(data.amount)` (should already be there from original rules).

### Task 12: Move shadcn to devDependencies

**Files:** `package.json`

**What to do:**
- Move `"shadcn"` from `dependencies` to `devDependencies` (it's a CLI tool).

### Task 13: Replace index keys in SpendingInsights

**Files:** `src/features/dashboard/SpendingInsights.jsx`

**What to do:**
- Line 114: Replace `key={i}` with a more stable key. Use `insight.text` as key since each insight text is unique enough.

### Task 14: Replace emoji with lucide icons in Badges

**Files:** `src/features/transactions/TransactionsPage.jsx`, `src/features/transactions/CalendarView.jsx`

**What to do:**
- In `TransactionsPage.jsx` line 215: Replace `📈` and `📉` emojis with lucide `TrendingUp` and `TrendingDown` icons (already imported at top of file? Check — if not, import them).
- In `CalendarView.jsx` line 154: Same replacement.

### Task 15: Add analytics error logging

**Files:** `src/lib/firebase.js`

**What to do:**
- Line 21-25: Replace the empty `catch {}` with `catch (e) { console.warn('Analytics init failed:', e) }`.

## Phase 4 — UX

### Task 16: Add logout confirmation dialog

**Files:** `src/app/layouts/DashboardLayout.jsx`

**What to do:**
- Import and use the `confirm` function from `@/app/providers` (useConfirmCtx).
- Before logging out, call `await confirm('Are you sure you want to log out?')` and only proceed if confirmed.

### Task 17: Add "Today" button to month pickers

**Files:** `src/features/dashboard/OverviewPage.jsx`, `src/features/transactions/TransactionsPage.jsx`, `src/features/transactions/CalendarView.jsx`

**What to do:**
- Add a "Today" button next to the month navigation that resets `month` state to `new Date()`.
- Use button variant "ghost", size "sm".

### Task 18: Add SW runtime caching for JS chunks

**Files:** `public/sw.js`

**What to do:**
- Add a runtime caching strategy for navigation requests (fallback to network, cache on success).
- Add cache for same-origin JS/CSS/assets with stale-while-revalidate.
- Don't cache Firebase API calls.

### Task 19: Add edit-form loading state

**Files:** `src/features/transactions/TransactionFormPage.jsx`

**What to do:**
- When editing (`editId` is set), show a loading skeleton until the transactions snapshot has loaded AND the matching transaction is found.
- Use the existing Skeleton component from shadcn.

### Task 20: Fix SW manifest icons path

**Files:** `public/manifest.json`

**What to do:**
- Update icon paths to match Task 5's SVG icons.
- Change from `png` references to `svg` and fix the paths.
