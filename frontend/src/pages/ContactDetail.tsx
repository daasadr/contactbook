import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Star, Trash2, Save, User } from 'lucide-react'
import Layout from '@/components/Layout'
import { contactsApi } from '@/api/contacts'
import type { FieldDefinition } from '@/types'
import clsx from 'clsx'

function FieldInput({ field, value, onChange }: {
  field: FieldDefinition
  value: unknown
  onChange: (val: unknown) => void
}) {
  const strVal = value !== undefined && value !== null ? String(value) : ''

  const inputClass = 'input'

  switch (field.field_type) {
    case 'textarea':
      return (
        <textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      )
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-zinc-700">{field.label}</span>
        </label>
      )
    case 'select':
      return (
        <select
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">— Vybrat —</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    case 'date':
      return (
        <input
          type="date"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className={inputClass}
        />
      )
    case 'email':
      return (
        <input
          type="email"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className={inputClass}
        />
      )
    case 'phone':
      return (
        <input
          type="tel"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? '+420 000 000 000'}
          className={inputClass}
        />
      )
    case 'url':
      return (
        <input
          type="url"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? 'https://'}
          className={inputClass}
        />
      )
    default:
      return (
        <input
          type="text"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className={inputClass}
        />
      )
  }
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

  const { data: contactData, isLoading: contactLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getOne(listId!, contactId!).then(r => r.data.contact),
    enabled: !!listId && !!contactId,
  })

  useEffect(() => {
    if (contactData && !initialized) {
      setFirstName(contactData.first_name)
      setLastName(contactData.last_name ?? '')
      setCustomData(contactData.custom_data ?? {})
      setInitialized(true)
    }
  }, [contactData, initialized])

  const { data: fieldsData } = useQuery({
    queryKey: ['fields', listId],
    queryFn: () => contactsApi.getFields(listId!).then(r => r.data.fields),
    enabled: !!listId,
  })

  const saveMutation = useMutation({
    mutationFn: () => contactsApi.update(listId!, contactId!, {
      first_name: firstName,
      last_name: lastName || undefined,
      custom_data: customData,
    } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
      queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
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

  const handleDelete = () => {
    if (confirm('Opravdu smazat tento kontakt?')) deleteMutation.mutate()
  }

  const contact = contactData
  const fields = fieldsData ?? []

  // Seskupit pole do sekcí
  const sections = fields.reduce<Record<string, FieldDefinition[]>>((acc, f) => {
    if (!acc[f.section]) acc[f.section] = []
    acc[f.section].push(f)
    return acc
  }, {})

  const sectionLabels: Record<string, string> = {
    contact: 'Kontaktní údaje',
    professional: 'Profesní informace',
    goals: 'Cíle',
    personal: 'Osobní informace',
    notes: 'Poznámky',
    general: 'Obecné',
  }

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
    <Layout maxWidth="lg">
      {/* Hlavička */}
      <div className="flex items-center gap-4 mb-6">
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
        <button onClick={handleDelete} className="btn-ghost p-2 text-zinc-400 hover:text-red-600">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Avatar + jméno */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl shrink-0">
            {initials || <User className="w-8 h-8" />}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Jméno *</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                placeholder="Jméno"
              />
            </div>
            <div>
              <label className="label">Příjmení</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder="Příjmení"
              />
            </div>
          </div>
        </div>

        {/* Sekce polí */}
        {Object.entries(sections).map(([sectionKey, sectionFields]) => (
          <div key={sectionKey} className="mb-6">
            <div className="section-title">{sectionLabels[sectionKey] ?? sectionKey}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sectionFields.map((field) => (
                field.field_type !== 'checkbox' ? (
                  <div key={field.id} className={field.field_type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="label">
                      {field.label}
                      {field.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <FieldInput
                      field={field}
                      value={customData[field.name]}
                      onChange={(val) => setCustomData((prev) => ({ ...prev, [field.name]: val }))}
                    />
                  </div>
                ) : (
                  <div key={field.id} className="flex items-center">
                    <FieldInput
                      field={field}
                      value={customData[field.name]}
                      onChange={(val) => setCustomData((prev) => ({ ...prev, [field.name]: val }))}
                    />
                  </div>
                )
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          {saveMutation.isError && (
            <p className="text-sm text-red-600">Uložení se nezdařilo</p>
          )}
          {saved && <p className="text-sm text-green-600">✓ Uloženo</p>}
          {!saveMutation.isError && !saved && <div />}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Ukládání…' : 'Uložit změny'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
