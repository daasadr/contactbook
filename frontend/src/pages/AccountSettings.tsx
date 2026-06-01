import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Trash2, Shield, Sparkles, CreditCard, Heart, Zap, UserCircle, Loader2 } from 'lucide-react'
import Layout from '@/components/Layout'
import { authApi, type UserProfile } from '@/api/auth'
import { billingApi, type CreditPack } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import BusinessCardEditor from '@/components/BusinessCardEditor'

// ── Credits & billing ──────────────────────────────────────────────────────

function CreditsSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [donationAmount, setDonationAmount] = useState('')
  const [loadingPack, setLoadingPack] = useState<string | null>(null)
  const [loadingDonation, setLoadingDonation] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  const { data: balanceData } = useQuery({
    queryKey: ['billing-balance'],
    queryFn: () => billingApi.getBalance().then(r => r.data.credits),
  })

  const { data: packsData } = useQuery({
    queryKey: ['billing-packs'],
    queryFn: () => billingApi.getPacks().then(r => r.data),
  })

  const stripeEnabled = packsData?.stripe_enabled ?? false
  const credits = balanceData ?? 0

  // Zpracuj návrat ze Stripe
  useEffect(() => {
    const payment = searchParams.get('payment')
    const sessionId = searchParams.get('session_id')

    if (payment === 'success' && sessionId) {
      setSearchParams({})
      billingApi.complete(sessionId)
        .then(res => {
          queryClient.setQueryData(['billing-balance'], res.data.credits)
          setStatusMsg({ type: 'success', text: `Platba proběhla ✓ Kredity přičteny, aktuální stav: ${res.data.credits}` })
        })
        .catch(() => setStatusMsg({ type: 'error', text: 'Nepodařilo se ověřit platbu. Kontaktuj podporu.' }))
    } else if (payment === 'donated') {
      setSearchParams({})
      setStatusMsg({ type: 'success', text: 'Díky za podporu! ❤️' })
    } else if (payment === 'cancelled') {
      setSearchParams({})
      setStatusMsg({ type: 'info', text: 'Platba byla zrušena.' })
    }
  }, [])

  const buyPack = async (pack: CreditPack) => {
    setLoadingPack(pack.id)
    try {
      const res = await billingApi.checkoutCredits(pack.id)
      window.location.href = res.data.url
    } catch {
      setStatusMsg({ type: 'error', text: 'Nepodařilo se zahájit platbu. Zkus to znovu.' })
      setLoadingPack(null)
    }
  }

  const sendDonation = async () => {
    const amount = parseFloat(donationAmount)
    if (!amount || amount < 1) return
    setLoadingDonation(true)
    try {
      const res = await billingApi.checkoutDonation(amount)
      window.location.href = res.data.url
    } catch {
      setStatusMsg({ type: 'error', text: 'Nepodařilo se zahájit platbu. Zkus to znovu.' })
      setLoadingDonation(false)
    }
  }

  const PRESET_AMOUNTS = [2, 5, 10, 20]

  return (
    <div className="space-y-4">
      {/* Stav kreditů */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-zinc-900">AI kredity</h2>
              <span className={`text-2xl font-bold ${credits <= 5 ? 'text-red-600' : 'text-primary-600'}`}>
                {credits}
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              Každý dotaz AI asistenta spotřebuje 1 kredit.
              {credits <= 5 && credits > 0 && (
                <span className="text-amber-600 font-medium"> Brzy dojdou — doplň zásobu.</span>
              )}
              {credits === 0 && (
                <span className="text-red-600 font-medium"> Kredity vyčerpány.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-zinc-100 text-zinc-600'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* Nákup kreditů */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-zinc-500" />
          <h2 className="font-semibold text-zinc-900">Dobít kredity</h2>
        </div>

        {!stripeEnabled ? (
          <p className="text-sm text-zinc-400 italic">Platby nejsou momentálně k dispozici.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(packsData?.packs ?? []).map(pack => (
              <button
                key={pack.id}
                onClick={() => buyPack(pack)}
                disabled={loadingPack !== null}
                className="relative flex flex-col items-center gap-1 p-4 rounded-xl border-2 border-zinc-200 hover:border-primary-400 hover:bg-primary-50 transition-all group text-center"
              >
                {pack.id === 'standard' && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide bg-primary-500 text-white px-2 py-0.5 rounded-full">
                    Oblíbený
                  </span>
                )}
                <Zap className="w-5 h-5 text-primary-500 group-hover:text-primary-600 mb-1" />
                <span className="font-bold text-zinc-900">{pack.label}</span>
                <span className="text-xs text-zinc-500">{pack.note}</span>
                <span className="mt-1 text-sm font-semibold text-primary-600">
                  {(pack.price_cents / 100).toFixed(2)} €
                </span>
                {loadingPack === pack.id && (
                  <span className="absolute inset-0 rounded-xl bg-white/70 flex items-center justify-center text-xs text-zinc-400">
                    Přesměrování…
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Donace */}
      {stripeEnabled && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-rose-500" />
            <h2 className="font-semibold text-zinc-900">Podpora programátora</h2>
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            Peopleworth je projekt jednoho člověka. Příspěvkem podpoříš další vývoj. ❤️
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setDonationAmount(String(a))}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  donationAmount === String(a)
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'border-zinc-200 text-zinc-700 hover:border-rose-300 hover:text-rose-600'
                }`}
              >
                {a} €
              </button>
            ))}
            <input
              type="number"
              value={donationAmount}
              onChange={e => setDonationAmount(e.target.value)}
              placeholder="Vlastní částka (€)"
              min={1}
              max={500}
              className="input w-40 text-sm"
            />
          </div>
          <button
            onClick={sendDonation}
            disabled={!donationAmount || parseFloat(donationAmount) < 1 || loadingDonation}
            className="btn-primary bg-rose-500 hover:bg-rose-600 focus:ring-rose-400"
          >
            <Heart className="w-4 h-4" />
            {loadingDonation ? 'Přesměrování…' : `Přispět ${donationAmount ? `${donationAmount} €` : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── User profile for AI ──────────────────────────────────────────────────────

const PROFILE_FIELDS: Array<{ key: keyof UserProfile; label: string; placeholder: string; multiline?: boolean }> = [
  { key: 'role', label: 'Profese / role', placeholder: 'Grafik, učitelka, podnikatelka...' },
  { key: 'about', label: 'O mně (volný text)', placeholder: 'Pár vět o sobě — co tě vystihuje...', multiline: true },
  { key: 'values', label: 'Mé hodnoty', placeholder: 'Co mi záleží, co je pro mě důležité...', multiline: true },
  { key: 'goals', label: 'Mé cíle', placeholder: 'Na čem pracuji, co chci dosáhnout...', multiline: true },
  { key: 'communication_style', label: 'Styl komunikace', placeholder: 'Introvert, preferuji e-mail, přímý styl...' },
  { key: 'strengths', label: 'Silné stránky', placeholder: 'V čem jsem dobrá, co mi jde...' },
  { key: 'challenges', label: 'Aktuální výzvy', placeholder: 'Co řeším, co mi dělá potíže...' },
  { key: 'interests', label: 'Zájmy a koníčky', placeholder: 'Knihy, příroda, design...' },
]

function ProfileSection() {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getProfile().then(r => r.data.profile),
  })

  const [form, setForm] = useState<UserProfile>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (profileData) setForm(profileData)
  }, [profileData])

  const handleSave = async () => {
    setSaving(true)
    try {
      await authApi.updateProfile(form)
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <UserCircle className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-zinc-900 mb-1">Můj profil pro AI asistenta</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Tyto informace AI použije jako kontext při všech konverzacích — rady budou osobnější a přesnější.
            Vyplň jen to, co chceš sdílet.
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Načítám…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROFILE_FIELDS.map(f => (
                <div key={f.key} className={f.multiline ? 'sm:col-span-2' : ''}>
                  <label className="label">{f.label}</label>
                  {f.multiline ? (
                    <textarea
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={3}
                      className="input resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[f.key] ?? ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="input"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Ukládám…' : 'Uložit profil'}
            </button>
            {saved && <span className="text-sm text-green-600">✓ Uloženo</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Export ──────────────────────────────────────────────────────────────────

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
          <button onClick={handleExport} disabled={loading} className="btn-primary">
            <Download className="w-4 h-4" />
            {loading ? 'Připravuji export…' : 'Stáhnout export dat'}
          </button>
          {done && <p className="text-sm text-green-600 mt-2">✓ Export stažen</p>}
        </div>
      </div>
    </div>
  )
}

// ── Delete account ──────────────────────────────────────────────────────────

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
              <p className="text-sm font-medium text-red-700">Pro potvrzení zadej své aktuální heslo:</p>
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
                <button onClick={handleDelete} disabled={loading || !password} className="btn-danger">
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

// ── Page ────────────────────────────────────────────────────────────────────

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

      <div className="space-y-6">
        {/* Digitální vizitka — první sekce */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Digitální vizitka</h2>
          </div>
          <BusinessCardEditor />
        </div>

        {/* Profil pro AI */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserCircle className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Můj profil pro AI</h2>
          </div>
          <ProfileSection />
        </div>

        {/* AI kredity a platby */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">AI asistent & platby</h2>
          </div>
          <CreditsSection />
        </div>

        {/* GDPR */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Ochrana soukromí & GDPR</h2>
          </div>
          <div className="space-y-4">
            <ExportSection />
            <DeleteSection />
          </div>
        </div>

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
