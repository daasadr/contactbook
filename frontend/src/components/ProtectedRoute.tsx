import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />

  // Neověřený email → přesměruj na čekací stránku (kromě /check-email samotného)
  if (!user.email_verified && location.pathname !== '/check-email') {
    return <Navigate to="/check-email" replace />
  }

  return <Outlet />
}
