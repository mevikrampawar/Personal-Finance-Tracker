# AGENTS.md — Personal Finance Tracker

## Quick Facts

- **Stack**: Vanilla JS (ES modules), HTML, CSS, Firebase 9.23 (Auth + Firestore + Analytics)
- **No build system**: No package.json, no bundler. All code runs natively in the browser via ES module imports.
- **Deployment**: GitHub Pages (`mevikrampawar.github.io/Personal-Finance-Tracker/`)
- **To run locally**: Open `index.html` in a browser or use a local server (e.g., `npx serve .`). ES modules require HTTP, not `file://`.

## Project Structure (flat, no subdirectories)

| File | Role |
|---|---|
| `index.html` | Login page — Google Auth popup |
| `tracker.html` | Main app shell — sidebar, pages, routing |
| `firebase-config.js` | Firebase init — exports `auth`, `db`, `provider`, `analytics` |
| `tracker-app.js` | App logic — auth, CRUD, routing, event listeners (1585 lines) |
| `tracker-ui.js` | UI rendering — calendar, charts, filters, formatting (769 lines) |
| `styles.css` | All styles — single file, 190KB |

## Architecture Notes

- **Single-page app feel**: `tracker.html` loads `tracker-app.js` as a module. All "pages" (overview, add, transactions, budgets, recurring) are sections toggled via `hidden` attribute and `data-page` attributes. No framework.
- **Hash-based routing**: Routes like `#/overview`, `#/add`, `#/transactions`, etc. Managed in `setupRouting()` in `tracker-app.js`.
- **Real-time data**: All Firestore reads use `onSnapshot` listeners — UI updates live without manual refresh.
- **Currency**: Hardcoded to **INR** (`en-IN` locale). Config is in `tracker-ui.js` `currencyConfig` object.
- **Category storage**: Dual system — Firestore subcollection (`users/{uid}/categories`) or legacy user-profile fields (`expenseCategories`, `categoryBudgets`). App auto-migrates and falls back to legacy if Firestore rules block subcollection writes.

## Firebase Setup

- **Project ID**: `personal-finance-tracker-babac`
- **Config**: `firebase-config.js` contains the live Firebase config (apiKey, projectId, etc.)
- **Auth**: Google sign-in via popup (`signInWithPopup`)
- **Firestore paths**:
  - `users/{uid}/transactions` — main transaction documents
  - `users/{uid}/categories` — category records (name, monthlyBudget)
  - `users/{uid}/recurringTransactions` — recurring templates
  - `users/{uid}` — user profile doc (legacy category storage, schema version)

## Development Conventions

- **No TypeScript, no transpilation**: Pure ES modules with `import`/`export`.
- **No tests**: No test framework. Verify changes by loading the app in a browser.
- **No linting**: No ESLint/Prettier configured. Follow existing code style (2-space indent, camelCase, JSDoc comments on exported functions).
- **DOM rendering**: All dynamic UI is built with DOM APIs (`createElement`, `appendChild`), not `innerHTML` with user data. Maintain this pattern to avoid XSS.
- **Delete buttons**: Use the "galaxy delete" pattern — `<span class="delete-lid">` + `<span class="delete-can">` for the trash-can animation.
- **Notification system**: Use `showNotification(message, type)` for user feedback. Never use `alert()`.
- **Confirmation dialogs**: Use `confirmAction(message)` (returns Promise<boolean>), not `window.confirm()`.

## Common Gotchas

1. **`styles.css` is huge (190KB)** — it contains all styles for both pages. Don't split without updating both HTML files.
2. **No hot reload** — Refresh the browser manually after edits.
3. **Firebase Analytics** is imported but not actively used for tracking events.
4. **Charts are canvas-based** — drawn manually in `renderCharts()`. No charting library.
5. **The login page (`index.html`) has inline `<script type="module">`** — it does not use `tracker-app.js`.
6. **`old-config/` directory** is gitignored — don't recreate or reference it.
7. **`DATABASE_SCHEMA.md`** is gitignored — it exists locally but should not be committed.
