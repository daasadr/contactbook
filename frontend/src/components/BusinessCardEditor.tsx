import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Sparkles, Loader2, ExternalLink, Palette } from 'lucide-react'
import { cardApi, type BusinessCard } from '@/api/card'
import { useAuthStore } from '@/stores/auth'

const ACCENT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#1d4ed8', '#7c3aed', '#be185d',
]

const FIELDS: Array<{ key: keyof BusinessCard; label: string; placeholder: string; type?: string }> = [
  { key: 'name', label: 'Jméno na vizitce', placeholder: 'Jak se chceš zobrazovat' },
  { key: 'title', label: 'Pozice / titul', placeholder: 'UX Designer, Freelancer, CEO...' },
  { key: 'company', label: 'Firma / projekt', placeholder: 'Název firmy nebo projektu' },
  { key: 'tagline', label: 'Tagline / bio', placeholder: 'Krátký poutavý popis (max 120 znaků)' },
  { key: 'email', label: 'Kontaktní e-mail', placeholder: 'jmeno@email.cz', type: 'email' },
  { key: 'phone', label: 'Telefon', placeholder: '+420 000 000 000', type: 'tel' },
  { key: 'website', label: 'Web / portfolio', placeholder: 'https://mujweb.cz', type: 'url' },
  { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/...' },
  { key: 'twitter', label: 'Twitter / X', placeholder: '@tvuj_nick' },
  { key: 'location', label: 'Město / lokace', placeholder: 'Praha, Česká republika' },
]

export default function BusinessCardEditor() {
  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-card'],
    queryFn: () => cardApi.getMyCard().then(r => r.data),
  })

  const [card, setCard] = useState<BusinessCard>({})
  const [showButton, setShowButton] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    if (data) {
      setCard(data.card)
      setShowButton(data.show_card_button)
      if (!data.card.name && user?.name) {
        setCard(c => ({ ...c, name: c.name || user.name }))
      }
    }
  }, [data, user])

  const field = (key: keyof BusinessCard) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCard(c => ({ ...c, [key]: e.target.value }))

  const saveCard = async () => {
    setSaving(true)
    try {
      await cardApi.saveCard(card, showButton)
      queryClient.invalidateQueries({ queryKey: ['my-card'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const generateWithAI = async () => {
    setGenerating(true)
    setAiError('')
    try {
      const res = await cardApi.generateWithAI()
      setCard(c => ({ ...c, ...res.data.generated }))
    } catch (err: any) {
      setAiError(err.response?.data?.error ?? 'AI generování selhalo.')
    } finally { setGenerating(false) }
  }

  const slug = data?.card_slug

  if (isLoading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${card.color || '#6366f1'}22` }}>
          <CreditCard className="w-5 h-5" style={{ color: card.color || '#6366f1' }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-zinc-900">Moje digitální vizitka</h2>
            {slug && (
              <a href={`/card/${slug}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                <ExternalLink className="w-3 h-3" /> Zobrazit
              </a>
            )}
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            Vizitka, kterou sdílíš s ostatními. Zobrazuje se jako plovoucí tlačítko v aplikaci.
          </p>

          {/* Toggle + AI */}
          <div className="flex flex-wrap items-center gap-4 mb-5 p-3 bg-zinc-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setShowButton(s => !s)}
                className={`relative w-10 h-5 rounded-full transition-colors ${showButton ? 'bg-primary-500' : 'bg-zinc-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showButton ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-zinc-700">Zobrazit plovoucí tlačítko</span>
            </label>
            <button onClick={generateWithAI} disabled={generating}
              className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-medium">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Vygenerovat AI
            </button>
            {aiError && <span className="text-xs text-red-500">{aiError}</span>}
          </div>

          {/* Barva */}
          <div className="mb-5">
            <label className="label flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Barva vizitky
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ACCENT_COLORS.map(c => (
                <button key={c} onClick={() => setCard(p => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${card.color === c ? 'ring-2 ring-offset-2 ring-zinc-400 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {FIELDS.map(f => (
              <div key={f.key} className={f.key === 'tagline' ? 'sm:col-span-2' : ''}>
                <label className="label">{f.label}</label>
                {f.key === 'tagline' ? (
                  <textarea value={card[f.key] ?? ''} onChange={field(f.key)} placeholder={f.placeholder}
                    rows={2} maxLength={120} className="input resize-none" />
                ) : (
                  <input type={f.type ?? 'text'} value={card[f.key] ?? ''} onChange={field(f.key)}
                    placeholder={f.placeholder} className="input" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveCard} disabled={saving} className="btn-primary">
              {saving ? 'Ukládám…' : 'Uložit vizitku'}
            </button>
            {saved && <span className="text-sm text-green-600">✓ Uloženo</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
