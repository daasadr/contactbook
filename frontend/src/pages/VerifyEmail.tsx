import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'notoken'>('loading')
  const [error, setError] = useState('')
  const { user, setAuth, accessToken } = useAuthStore()

  useEffect(() => {
    if (!token) { setStatus('notoken'); return }
    authApi.verifyEmail(token)
      .then(async () => {
        // Aktualizuj user store — email je teď ověřen
        if (user && accessToken) {
          try {
            const res = await authApi.refresh()
            setAuth(res.data.user, res.data.accessToken)
          } catch { /* ignore — user bude muset refreshnout */ }
        }
        setStatus('success')
      })
      .catch(err => {
        setError(err.response?.data?.error ?? 'Ověření selhalo.')
        setStatus('error')
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-600">Ověřuji e-mail…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-zinc-900 mb-2">E-mail ověřen!</h1>
            <p className="text-zinc-500 mb-6">Tvůj účet je plně aktivní. Vítej v Peopleworth!</p>
            <Link to="/dashboard" className="btn-primary">Přejít do aplikace</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-zinc-900 mb-2">Odkaz není platný</h1>
            <p className="text-zinc-500 mb-6">{error}</p>
            <Link to="/dashboard" className="btn-secondary">Zpět do aplikace</Link>
          </>
        )}
        {status === 'notoken' && (
          <>
            <Mail className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-zinc-900 mb-2">Zkontroluj svou schránku</h1>
            <p className="text-zinc-500">Ověřovací odkaz jsme ti poslali e-mailem po registraci.</p>
          </>
        )}
      </div>
    </div>
  )
}
