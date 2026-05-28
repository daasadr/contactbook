import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Trash2, Shield } from 'lucide-react'
import Layout from '@/components/Layout'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

function ExportSection() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await authApi.exportData()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `peopleworth-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch {
      alert('Export se nezdařil. Zkus to znovu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-zinc-900 mb-1">Export dat (GDPR čl. 20)</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Stáhni kompletní zálohu všech svých dat ve formátu JSON — účet, všechny seznamy,
            kontakty, deníkové záznamy i propojení.
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="btn-primary"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Připravuji export…' : 'Stáhnout export dat'}
          </button>
          {done && <p className="text-sm text-green-600 mt-2">✓ Export stažen</p>}
        </div>
      </div>
    </div>
  )
}

function DeleteSection() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      await authApi.deleteAccount(password)
      logout()
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Smazání se nezdařilo. Zkus to znovu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 border-red-200">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-zinc-900 mb-1">Smazat účet (GDPR čl. 17)</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Trvale smaže tvůj účet, všechny kontakty, seznamy, deníkové záznamy a veškerá data.
            Tuto akci nelze vrátit.
          </p>

          {!open ? (
            <button onClick={() => setOpen(true)} className="btn-danger">
              <Trash2 className="w-4 h-4" /> Smazat účet
            </button>
          ) : (
            <div className="space-y-3 max-w-sm">
              <p className="text-sm font-medium text-red-700">
                Pro potvrzení zadej své aktuální heslo:
              </p>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Tvoje heslo"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleDelete()}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={loading || !password}
                  className="btn-danger"
                >
                  {loading ? 'Mazání…' : 'Potvrdit smazání'}
                </button>
                <button onClick={() => { setOpen(false); setPassword(''); setError('') }} className="btn-secondary">
                  Zrušit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccountSettings() {
  const user = useAuthStore(s => s.user)

  return (
    <Layout maxWidth="lg">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/dashboard" className="btn-ghost p-2 text-zinc-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Nastavení účtu</h1>
          <p className="text-sm text-zinc-500">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* GDPR sekce */}
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Ochrana soukromí & GDPR</h2>
        </div>

        <ExportSection />
        <DeleteSection />

        <p className="text-xs text-zinc-400 text-center pt-2">
          Podrobnosti o zpracování osobních údajů:{' '}
          <Link to="/privacy" className="text-primary-600 hover:underline">
            Zásady ochrany osobních údajů
          </Link>
        </p>
      </div>
    </Layout>
  )
}
