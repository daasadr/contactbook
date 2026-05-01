import { Link, useNavigate } from 'react-router-dom'
import { BookUser, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    logout()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <BookUser className="w-6 h-6" />
            <span>ContactBook</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="btn-ghost hidden sm:flex">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <div className="flex items-center gap-2 pl-3 border-l border-zinc-200">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-zinc-700 hidden sm:block">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="btn-ghost text-zinc-500 hover:text-red-600">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-secondary">Přihlásit se</Link>
              <Link to="/register" className="btn-primary">Registrace</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
