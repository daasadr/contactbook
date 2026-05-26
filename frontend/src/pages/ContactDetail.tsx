import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Star, Trash2, Save, User, Bell, ChevronDown, ChevronUp, PenLine } from 'lucide-react'
import Layout from '@/components/Layout'
import { contactsApi } from '@/api/contacts'
import type { FieldDefinition } from '@/types'
import clsx from 'clsx'

const MONTHS_CS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']

function displayFieldValue(field: FieldDefinition, value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (field.field_type === 'checkbox') return value ? 'Ano' : ''
  if (field.field_type === 'select') {
    const opt = (field.options ?? []).find(o => o.value === String(value))
    return opt?.label ?? String(value)
  }
  if (field.field_type === 'month_day') {
    const m = String(value).match(/^(\d{2})-(\d{2})$/)
    if (m) return `${parseInt(m[2])}. ${MONTHS_CS[parseInt(m[1]) - 1] ?? m[1]}`
    return String(value)
  }
  if (field.field_type === 'date') {
    try { return new Date(String(value)).toLocaleDateString('cs-CZ') } catch { return String(value) }
  }
  return String(value)
}

function MonthDayInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const str = value ? String(value) : ''
  const mmdd = str.match(/^(\d{2})-(\d{2})$/)
  const yyyymmdd = str.match(/^\d{4}-(\d{2})-(\d{2})$/)
  const initMonth = mmdd ? parseInt(mmdd[1]) : yyyymmdd ? parseInt(yyyymmdd[1]) : 0
  const initDay = mmdd ? parseInt(mmdd[2]) : yyyymmdd ? parseInt(yyyymmdd[2]) : 0

  const [month, setMonth] = useState(initMonth)
  const [day, setDay] = useState(initDay)

  const daysInMonth = month ? new Date(2000, month, 0).getDate() : 31

  const handleMonthChange = (m: number) => {
    const maxDay = m ? new Date(2000, m, 0).getDate() : 31
    const clampedDay = day > maxDay ? maxDay : day
    setMonth(m)
    if (day > maxDay) setDay(clampedDay)
    if (m && clampedDay) onChange(`${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`)
    else onChange('')
  }

  const handleDayChange = (d: number) => {
    setDay(d)
    if (month && d) onChange(`${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    else onChange('')
  }

  return (
    <div className="flex gap-2">
      <select value={day || ''} onChange={(e) => handleDayChange(parseInt(e.target.value) || 0)} className="input flex-1 min-w-0">
        <option value="">Den</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{d}.</option>
        ))}
      </select>
      <select value={month || ''} onChange={(e) => handleMonthChange(parseInt(e.target.value) || 0)} className="input flex-1 min-w-0">
        <option value="">Měsíc</option>
        {MONTHS_CS.map((m, i) => (
          <option key={i + 1} value={i + 1}>{m}</option>
        ))}
      </select>
    </div>
  )
}

function FieldInput({ field, value, onChange }: {
  field: FieldDefinition
  value: unknown
  onChange: (val: unknown) => void
}) {
  const strVal = value !== undefined && value !== null ? String(value) : ''
  const cls = 'input'

  switch (field.field_type) {
    case 'textarea':
      return <textarea value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ''} rows={3} className={`${cls} resize-none`} />
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500" />
          <span className="text-sm text-zinc-700">{field.label}</span>
        </label>
      )
    case 'select':
      return (
        <select value={strVal} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">— Vybrat —</option>
          {(field.options ?? []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      )
    case 'date':
      return <input type="date" value={strVal} onChange={(e) => onChange(e.target.value)} className={cls} />
    case 'month_day':
      return <MonthDayInput value={value} onChange={onChange} />
    case 'number':
      return <input type="number" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ''} className={cls} />
    case 'email':
      return <input type="email" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ''} className={cls} autoFocus />
    case 'phone':
      return <input type="tel" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? '+420 000 000 000'} className={cls} autoFocus />
    case 'url':
      return <input type="url" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? 'https://'} className={cls} autoFocus />
    default:
      return <input type="text" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ''} className={cls} autoFocus />
  }
}

function FieldRow({ field, value, onChange, isEditing, onToggleEdit }: {
  field: FieldDefinition
  value: unknown
  onChange: (v: unknown) => void
  isEditing: boolean
  onToggleEdit: () => void
}) {
  const isTextarea = field.field_type === 'textarea'
  const isCheckbox = field.field_type === 'checkbox'
  const colSpan = isTextarea ? 'sm:col-span-2' : ''

  if (isEditing) {
    if (isCheckbox) {
      return (
        <div className="flex items-center justify-between">
          <FieldInput field={field} value={value} onChange={onChange} />
          <button onClick={onToggleEdit} title="Zavřít" className="ml-2 p-1 rounded text-primary-500 hover:text-primary-700">
            <PenLine className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
    return (
      <div className={colSpan}>
        <div className="flex items-center justify-between mb-1">
          <label className="label">
            {field.label}
            {field.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <button onClick={onToggleEdit} title="Zavřít editaci" className="p-0.5 rounded text-primary-400 hover:text-primary-600">
            <PenLine className="w-3.5 h-3.5" />
          </button>
        </div>
        <FieldInput field={field} value={value} onChange={onChange} />
      </div>
    )
  }

  // View mode
  const display = displayFieldValue(field, value)

  if (isCheckbox) {
    return (
      <div className="flex items-center justify-between group">
        <div className="flex items-center gap-2">
          <div className={clsx('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
            value ? 'bg-primary-500 border-primary-500 text-white' : 'border-zinc-300'
          )}>
            {!!value && <span className="text-[10px] leading-none font-bold">✓</span>}
          </div>
          <span className="text-sm text-zinc-700">{field.label}</span>
        </div>
        <button onClick={onToggleEdit} title="Upravit" className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-300 hover:text-zinc-500">
          <PenLine className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className={clsx('group', colSpan)}>
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <span className="text-xs font-medium text-zinc-400">
          {field.label}
          {field.is_required && <span className="text-red-400 ml-1">*</span>}
        </span>
        <button onClick={onToggleEdit} title="Upravit" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded text-zinc-300 hover:text-zinc-500 -mt-0.5">
          <PenLine className="w-3.5 h-3.5" />
        </button>
      </div>
      {display ? (
        <p className={clsx('text-sm text-zinc-800 break-words', isTextarea && 'whitespace-pre-wrap')}>{display}</p>
      ) : (
        <p className="text-sm text-zinc-300">—</p>
      )}
    </div>
  )
}

const SECTION_LABELS: Record<string, string> = {
  contact: 'Kontaktní údaje',
  professional: 'Profesní informace',
  goals: 'Cíle',
  personal: 'Osobní informace',
  notes: 'Poznámky',
  general: 'Obecné',
}

export default function ContactDetail() {
  const { listId, contactId } = useParams<{ listId: string; contactId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [saved, setSaved] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set())
  const [nameEditing, setNameEditing] = useState(false)

  const { data: contactData, isLoading: contactLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getOne(listId!, contactId!).then(r => r.data.contact),
    enabled: !!listId && !!contactId,
    gcTime: 0,
  })

  useEffect(() => {
    if (contactData && !initialized) {
      setFirstName(contactData.first_name)
      setLastName(contactData.last_name ?? '')
      const raw = contactData.custom_data
      setCustomData(raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {})
      setInitialized(true)
    }
  }, [contactData, initialized])

  const { data: fieldsData } = useQuery({
    queryKey: ['fields', listId],
    queryFn: () => contactsApi.getFields(listId!).then(r => r.data.fields),
    enabled: !!listId,
  })

  const updateField = (name: string, val: unknown) =>
    setCustomData((prev) => ({ ...prev, [name]: val }))

  const toggleFieldEdit = (name: string) => {
    setEditingFields(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const saveMutation = useMutation({
    mutationFn: () => contactsApi.update(listId!, contactId!, {
      first_name: firstName,
      last_name: lastName || undefined,
      custom_data: customData,
    } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
      queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
      setEditingFields(new Set())
      setNameEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const starMutation = useMutation({
    mutationFn: () => contactsApi.toggleStar(listId!, contactId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact', contactId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => contactsApi.delete(listId!, contactId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      navigate(`/lists/${listId}`)
    },
  })

  const fields = fieldsData ?? []
  const profileFields = fields.filter(f => f.section === 'contact')
  const detailFields = fields.filter(f => f.section !== 'contact')
  const detailSections = detailFields.reduce<Record<string, FieldDefinition[]>>((acc, f) => {
    if (!acc[f.section]) acc[f.section] = []
    acc[f.section].push(f)
    return acc
  }, {})

  const DETAIL_PREVIEW_LIMIT = 6
  const showExpandButton = detailFields.length > DETAIL_PREVIEW_LIMIT

  const visibleDetailSections = detailsExpanded
    ? detailSections
    : (() => {
        let count = 0
        const result: Record<string, FieldDefinition[]> = {}
        for (const [sec, sFields] of Object.entries(detailSections)) {
          const slice = sFields.slice(0, DETAIL_PREVIEW_LIMIT - count)
          if (slice.length > 0) result[sec] = slice
          count += sFields.length
          if (count >= DETAIL_PREVIEW_LIMIT) break
        }
        return result
      })()

  const contact = contactData
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const initials = [firstName, lastName].filter(Boolean).map((n) => n[0].toUpperCase()).join('')

  if (contactLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout maxWidth="xl">
      {/* Hlavička */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/lists/${listId}`} className="btn-ghost p-2 text-zinc-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => starMutation.mutate()}
          className={clsx('btn-ghost p-2', contact?.is_starred ? 'text-yellow-500' : 'text-zinc-400')}
        >
          <Star className={clsx('w-5 h-5', contact?.is_starred && 'fill-yellow-500')} />
        </button>
        <button
          onClick={() => { if (confirm('Opravdu smazat tento kontakt?')) deleteMutation.mutate() }}
          className="btn-ghost p-2 text-zinc-400 hover:text-red-600"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* HORNÍ ŘADA: Profil + Aktuality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Profil karta */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Profil</h2>

          {/* Avatar + jméno */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-2xl shrink-0 select-none">
              {initials || <User className="w-10 h-10" />}
            </div>

            {nameEditing ? (
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jméno *</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" placeholder="Jméno" autoFocus />
                </div>
                <div>
                  <label className="label">Příjmení</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" placeholder="Příjmení" />
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="group flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-zinc-900 truncate">
                    {fullName || <span className="text-zinc-400 font-normal">Jméno kontaktu</span>}
                  </h3>
                  <button
                    onClick={() => setNameEditing(true)}
                    title="Upravit jméno"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded text-zinc-300 hover:text-zinc-500"
                  >
                    <PenLine className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kontaktní pole (sekce 'contact') */}
          {profileFields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profileFields.map(field => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={customData[field.name]}
                  onChange={(v) => updateField(field.name, v)}
                  isEditing={editingFields.has(field.name)}
                  onToggleEdit={() => toggleFieldEdit(field.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Aktuality — placeholder */}
        <div className="card p-6 flex flex-col items-center justify-center min-h-[220px] border-dashed border-zinc-200">
          <Bell className="w-10 h-10 text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">Připomínky a aktuality</p>
          <p className="text-xs text-zinc-300 mt-1">Narozeniny, výročí, AI tipy… Připravujeme</p>
        </div>
      </div>

      {/* DOLNÍ ŘADA: Podrobnosti + Kniha záznamů */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">

        {/* Podrobnosti (3/5) */}
        <div className="lg:col-span-3 card p-6">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Podrobnosti</h2>

          {detailFields.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">
              Přidej pole v{' '}
              <Link to={`/lists/${listId}/settings`} className="text-primary-600 hover:underline">nastavení seznamu</Link>
            </p>
          ) : (
            <>
              {Object.entries(visibleDetailSections).map(([sectionKey, sFields]) => (
                <div key={sectionKey} className="mb-5 last:mb-0">
                  <div className="section-title">{SECTION_LABELS[sectionKey] ?? sectionKey}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sFields.map(field => (
                      <FieldRow
                        key={field.id}
                        field={field}
                        value={customData[field.name]}
                        onChange={(v) => updateField(field.name, v)}
                        isEditing={editingFields.has(field.name)}
                        onToggleEdit={() => toggleFieldEdit(field.name)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {showExpandButton && (
                <button
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mt-3"
                >
                  {detailsExpanded ? (
                    <><ChevronUp className="w-4 h-4" /> Méně informací</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Více informací ({detailFields.length - DETAIL_PREVIEW_LIMIT} dalších polí)</>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Kniha záznamů (2/5) */}
        <div className="lg:col-span-2 card p-6 flex flex-col items-center justify-center">
          <Link
            to={`/lists/${listId}/contacts/${contactId}/events`}
            className="group flex flex-col items-center gap-3 hover:opacity-85 transition-opacity"
          >
            <img
              src="/kniha_zaznamu_green_animated.png"
              alt="Kniha záznamů"
              className="w-44 h-auto drop-shadow-lg"
            />
            <div className="text-center">
              <p className="font-semibold text-zinc-800 group-hover:text-primary-700 transition-colors">Kniha záznamů</p>
              <p className="text-xs text-zinc-400 mt-0.5">Záznamy ze setkání</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Uložit */}
      <div className="flex items-center justify-between pb-2">
        <div>
          {saveMutation.isError && (
            <p className="text-sm text-red-600">
              Uložení selhalo
              {(saveMutation.error as any)?.response?.data?.error
                ? `: ${(saveMutation.error as any).response.data.error}`
                : (saveMutation.error as any)?.response?.status
                  ? ` (HTTP ${(saveMutation.error as any).response.status})`
                  : ''}
            </p>
          )}
          {saved && <p className="text-sm text-green-600">✓ Uloženo</p>}
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !firstName.trim()}
          className="btn-primary"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Ukládání…' : 'Uložit změny'}
        </button>
      </div>
    </Layout>
  )
}
