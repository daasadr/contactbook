import { useState } from 'react'
import { Mail, X, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

export default function EmailVerificationBanner() {
  const user = useAuthStore(s => s.user)
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user || user.email_verified || dismissed) return null

  const resend = async () => {
    setSending(true)
    try {
      await authApi.resendVerification()
      setSent(true)
    } catch { /* ignore */ } finally { setSending(false) }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Mail className="w-4 h-4 shrink-0" />
          <span>
            Ověř svůj e-mail <strong>{user.email}</strong> — odkaz jsme ti poslali po registraci.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sent ? (
            <span className="flex items-center gap-1 text-xs text-green-700">
              <CheckCircle className="w-3.5 h-3.5" /> Odesláno
            </span>
          ) : (
            <button
              onClick={resend}
              disabled={sending}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Poslat znovu'}
            </button>
          )}
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
