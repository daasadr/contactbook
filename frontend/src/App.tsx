import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import CookieBanner from '@/components/CookieBanner'
import { FloatingCardButton } from '@/components/BusinessCard'
import EmailVerificationBanner from '@/components/EmailVerificationBanner'

// Eagerly loaded — needed on first paint
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'

// Lazily loaded — split into separate chunks
const ForgotPassword  = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword   = lazy(() => import('@/pages/ResetPassword'))
const PrivacyPolicy   = lazy(() => import('@/pages/PrivacyPolicy'))
const Dashboard       = lazy(() => import('@/pages/Dashboard'))
const ListDetail      = lazy(() => import('@/pages/ListDetail'))
const ContactDetail   = lazy(() => import('@/pages/ContactDetail'))
const ContactEvents   = lazy(() => import('@/pages/ContactEvents'))
const SavedAIChats    = lazy(() => import('@/pages/SavedAIChats'))
const PublicCard      = lazy(() => import('@/pages/PublicCard'))
const HelpPage        = lazy(() => import('@/pages/HelpPage'))
const VerifyEmail     = lazy(() => import('@/pages/VerifyEmail'))
const CheckEmail      = lazy(() => import('@/pages/CheckEmail'))
const ListSettings    = lazy(() => import('@/pages/ListSettings'))
const AccountSettings = lazy(() => import('@/pages/AccountSettings'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { setAuth, logout, isLoading } = useAuthStore()

  useEffect(() => {
    authApi.refresh()
      .then((res) => setAuth(res.data.user, res.data.accessToken))
      .catch(() => logout())
  }, [])

  if (isLoading) return <PageLoader />

  return (
    <BrowserRouter>
      <EmailVerificationBanner />
      <CookieBanner />
      <FloatingCardButton />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/card/:slug" element={<PublicCard />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/lists/:listId" element={<ListDetail />} />
            <Route path="/lists/:listId/contacts/:contactId" element={<ContactDetail />} />
            <Route path="/lists/:listId/contacts/:contactId/events" element={<ContactEvents />} />
            <Route path="/lists/:listId/contacts/:contactId/saved-chats" element={<SavedAIChats />} />
            <Route path="/lists/:listId/settings" element={<ListSettings />} />
            <Route path="/settings" element={<AccountSettings />} />
          <Route path="/check-email" element={<CheckEmail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
