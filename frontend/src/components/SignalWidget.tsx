import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Radio, Sparkles, Cake, Clock, Loader2, ChevronDown, ChevronUp, Pin, Check } from 'lucide-react'
import { signalApi, type NeglectedContact, type UpcomingBirthday, type SignalData } from '@/api/signal'
import { tasksApi } from '@/api/tasks'

function fullName(c: { first_name: string; last_name?: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

function dayLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return 'Žádný záznam'
  if (days === 0) return 'Dnes'
  if (days === 1) return 'Včera'
  if (days < 7) return `${days} dní`
  if (days < 30) return `${Math.floor(days / 7)} týd.`
  if (days < 365) return `${Math.floor(days / 30)} měs.`
  return `${Math.floor(days / 365)} r.`
}

function SaveTaskInline({ contact, onSaved }: {
  contact: { id: string; first_name: string; last_name?: string | null }
  onSaved: () => void
}) {
  const [title, setTitle] = useState(`Zkontaktovat ${fullName(contact)}`)
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await tasksApi.create({ contact_id: contact.id, title: title.trim(), due_date: dueDate || null })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onSaved()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  return (
    <div className="mt-2 flex gap-2 items-center flex-wrap">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="input text-xs py-1 flex-1 min-w-[160px]"
        placeholder="Název úkolu"
      />
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        className="input text-xs py-1 w-36"
      />
      <button onClick={save} disabled={saving || !title.trim()} className="btn-primary text-xs py-1 px-3">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Uložit'}
      </button>
    </div>
  )
}

const SWIPE_THRESHOLD = 90

function NeglectedRow({ c, onDismiss }: { c: NeglectedContact; onDismiss: (id: string) => void }) {
  const [showTask, setShowTask] = useState(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const startX = useRef<number | null>(null)
  const startY = useRef(0)
  const didSwipe = useRef(false)  // brání navigaci na odkaz po tažení

  const onPointerDown = (e: React.PointerEvent) => {
    if (showTask) return           // během editace úkolu nešvihat
    startX.current = e.clientX
    startY.current = e.clientY
    didSwipe.current = false
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return
    const ddx = e.clientX - startX.current
    const ddy = e.clientY - startY.current
    if (!dragging) {
      // Aktivovat tažení až při jasně vodorovném pohybu (odliší od kliknutí a svislého scrollu)
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) {
        setDragging(true)
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
      } else {
        return
      }
    }
    setDx(ddx)
  }

  const onPointerUp = () => {
    startX.current = null
    if (!dragging) return
    setDragging(false)
    didSwipe.current = true
    setTimeout(() => { didSwipe.current = false }, 60)
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      setDismissing(true)
      setDx(dx > 0 ? 500 : -500)            // odletí ze strany
      setTimeout(() => onDismiss(c.id), 180)
    } else {
      setDx(0)                               // vrátit zpět
    }
  }

  const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1)

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Pozadí odhalené při tažení — „vyřešeno“ */}
      <div
        className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none"
        style={{ background: 'rgba(16,185,129,0.20)', opacity: dismissing ? 1 : progress }}
      >
        <span className="text-xs text-emerald-200 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Vyřešeno</span>
        <span className="text-xs text-emerald-200 font-medium flex items-center gap-1">Vyřešeno <Check className="w-3.5 h-3.5" /></span>
      </div>

      <div
        className="relative py-2 border-b border-white/10 last:border-0 select-none"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.18s ease-out',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/lists/${c.list_id}/contacts/${c.id}`}
            onClick={(e) => { if (didSwipe.current || dragging) e.preventDefault() }}
            className="font-medium text-sm text-white hover:text-primary-200 transition-colors truncate"
          >
            {fullName(c)}
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/50">{dayLabel(c.days_since)}</span>
            <button
              onClick={() => setShowTask(s => !s)}
              title="Přidat úkol"
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setDismissing(true); setDx(-500); setTimeout(() => onDismiss(c.id), 180) }}
              title="Vyřešeno — skrýt a spustit nový odpočet"
              className="p-1 rounded text-white/40 hover:text-emerald-300 hover:bg-white/10 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-white/40">{c.list_name}</p>
        {showTask && (
          <SaveTaskInline
            contact={c}
            onSaved={() => setShowTask(false)}
          />
        )}
      </div>
    </div>
  )
}

function BirthdayRow({ b }: { b: UpcomingBirthday }) {
  const [showTask, setShowTask] = useState(false)
  const label = b.days_until === 0 ? '🎂 Dnes!' : b.days_until === 1 ? 'Zítra' : `Za ${b.days_until} dní`
  return (
    <div className="py-2 border-b border-white/10 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/lists/${b.list_id}/contacts/${b.id}`}
          className="font-medium text-sm text-white hover:text-primary-200 transition-colors truncate"
        >
          {fullName(b)}
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium ${b.days_until <= 3 ? 'text-yellow-300' : 'text-white/60'}`}>
            {label}
          </span>
          <button
            onClick={() => setShowTask(s => !s)}
            title="Přidat úkol"
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {showTask && (
        <SaveTaskInline
          contact={b}
          onSaved={() => setShowTask(false)}
        />
      )}
    </div>
  )
}

export default function SignalWidget() {
  const [expanded, setExpanded] = useState(true)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showAi, setShowAi] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['signal'],
    queryFn: () => signalApi.get().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const dismissNeglected = (id: string) => {
    // Optimisticky odeber z widgetu, pak potvrď na serveru (nastaví nový odpočet).
    queryClient.setQueryData<SignalData>(['signal'], (old) =>
      old ? { ...old, neglected: old.neglected.filter(c => c.id !== id) } : old)
    signalApi.dismiss(id).catch(() => queryClient.invalidateQueries({ queryKey: ['signal'] }))
  }

  const total = (data?.neglected.length ?? 0) + (data?.birthdays.length ?? 0)
  if (!isLoading && total === 0) return null

  const runAi = async () => {
    setAiLoading(true)
    setAiError('')
    setShowAi(true)
    try {
      const res = await signalApi.analyze()
      setAiText(res.data.analysis)
      queryClient.invalidateQueries({ queryKey: ['billing-balance'] })
    } catch (err: any) {
      const status = err.response?.status
      setAiError(
        status === 402 ? 'Nedostatek kreditů. Zakup si další v nastavení.'
        : status === 503 ? 'AI není momentálně k dispozici.'
        : 'Chyba při analýze. Zkus to znovu.'
      )
    } finally { setAiLoading(false) }
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)',
      boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary-300" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Signál</h2>
            <p className="text-xs text-white/50">
              {isLoading ? 'Načítám…' : `${total} kontaktů vyžaduje pozornost`}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Zanedbané kontakty */}
              {data!.neglected.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Dlouho bez kontaktu</span>
                  </div>
                  <p className="text-[11px] text-white/35 mb-2">Přejeď do boku (nebo ✓) = vyřešeno, spustí nový odpočet</p>
                  {data!.neglected.map(c => <NeglectedRow key={c.id} c={c} onDismiss={dismissNeglected} />)}
                </div>
              )}

              {/* Narozeniny */}
              {data!.birthdays.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Cake className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Blížící se narozeniny</span>
                  </div>
                  {data!.birthdays.map(b => <BirthdayRow key={`${b.id}-${b.birthday_value}`} b={b} />)}
                </div>
              )}
            </div>
          )}

          {/* AI analýza */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={runAi}
              disabled={aiLoading}
              className="flex items-center gap-2 text-sm text-primary-300 hover:text-white transition-colors"
            >
              {aiLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzuji…</>
                : <><Sparkles className="w-4 h-4" /> Kdo je priorita tento týden? (1 kredit)</>
              }
            </button>

            {aiError && <p className="text-xs text-red-400 mt-2">{aiError}</p>}

            {showAi && aiText && (
              <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{aiText}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
