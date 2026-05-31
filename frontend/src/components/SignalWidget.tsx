import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Radio, Sparkles, Cake, Clock, Loader2, ChevronDown, ChevronUp, Pin } from 'lucide-react'
import { signalApi, type NeglectedContact, type UpcomingBirthday } from '@/api/signal'
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

function NeglectedRow({ c }: { c: NeglectedContact }) {
  const [showTask, setShowTask] = useState(false)
  return (
    <div className="py-2 border-b border-white/10 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/lists/${c.list_id}/contacts/${c.id}`}
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
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Dlouho bez kontaktu</span>
                  </div>
                  {data!.neglected.map(c => <NeglectedRow key={c.id} c={c} />)}
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
