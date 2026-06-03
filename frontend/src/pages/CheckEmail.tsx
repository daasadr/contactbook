import { useState } from 'react'
import { Mail, Loader2, CheckCircle, LogOut } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useNavigate } from 'react-router-dom'

export default function CheckEmail() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const resend = async () => {
    setSending(true)
    try {
      await authApi.resendVerification()
      setSent(true)
      setTimeout(() => setSent(false), 5000)
    } catch { /* ignore */ } finally { setSending(false) }
  }

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Mail className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Ověř svůj e-mail</h1>
        <p className="text-zinc-500 mb-2">
          Poslali jsme ověřovací odkaz na
        </p>
        <p className="font-semibold text-zinc-800 mb-6">{user?.email}</p>
        <p className="text-sm text-zinc-400 mb-8">
          Klikni na odkaz v e-mailu a pak se vrať do aplikace.
          Pokud e-mail nevidíš, zkontroluj složku spam.
        </p>

        <div className="flex flex-col gap-3">
          {sent ? (
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" /> E-mail byl znovu odeslán
            </div>
          ) : (
            <button onClick={resend} disabled={sending}
              className="btn-secondary w-full">
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Odesílám…</>
                : 'Odeslat e-mail znovu'
              }
            </button>
          )}
          <button onClick={handleLogout}
            className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-600">
            <LogOut className="w-4 h-4" /> Odhlásit se
          </button>
        </div>
      </div>
    </div>
  )
}
