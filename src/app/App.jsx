import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider'
import LoginPage from '@/features/auth/LoginPage'
import DashboardLayout from '@/app/layouts/DashboardLayout'

const LandingPage = lazy(() => import('@/features/landing/LandingPage'))
const OverviewPage = lazy(() => import('@/features/dashboard/OverviewPage'))
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage'))
const TransactionFormPage = lazy(() => import('@/features/transactions/TransactionFormPage'))
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'))
const RecurringPage = lazy(() => import('@/features/recurring/RecurringPage'))
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage'))
const NetWorthPage = lazy(() => import('@/features/networth/NetWorthPage'))
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/SubscriptionsPage'))
const MonthlyComparisonPage = lazy(() => import('@/features/dashboard/MonthlyComparisonPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="add" element={<TransactionFormPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="recurring" element={<RecurringPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="networth" element={<NetWorthPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="compare" element={<MonthlyComparisonPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  )
}
