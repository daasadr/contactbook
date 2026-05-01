import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import ListDetail from '@/pages/ListDetail'
import ContactDetail from '@/pages/ContactDetail'
import ListSettings from '@/pages/ListSettings'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function App() {
  const { setAuth, logout, setLoading, isLoading } = useAuthStore()

  useEffect(() => {
    authApi.refresh()
      .then((res) => setAuth(res.data.user, res.data.accessToken))
      .catch(() => logout())
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lists/:listId" element={<ListDetail />} />
          <Route path="/lists/:listId/contacts/:contactId" element={<ContactDetail />} />
          <Route path="/lists/:listId/settings" element={<ListSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
