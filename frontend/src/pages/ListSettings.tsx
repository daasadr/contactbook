import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, GripVertical, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Layout from '@/components/Layout'
import { listsApi } from '@/api/lists'
import { contactsApi } from '@/api/contacts'
import type { FieldDefinition, FieldType } from '@/types'
import clsx from 'clsx'

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Krátký text' },
  { value: 'textarea', label: 'Dlouhý text' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefon' },
  { value: 'url', label: 'URL / odkaz' },
  { value: 'date', label: 'Datum' },
  { value: 'number', label: 'Číslo' },
  { value: 'select', label: 'Výběr ze seznamu' },
  { value: 'checkbox', label: 'Zaškrtávátko' },
]

const sections = [
  { value: 'contact', label: 'Kontaktní údaje' },
  { value: 'professional', label: 'Profesní informace' },
  { value: 'personal', label: 'Osobní informace' },
  { value: 'goals', label: 'Cíle' },
  { value: 'notes', label: 'Poznámky' },
  { value: 'general', label: 'Obecné' },
]

const addFieldSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Pouze malá písmena, číslice a podtržítko'),
  label: z.string().min(1).max(255),
  field_type: z.enum(['text', 'textarea', 'email', 'phone', 'url', 'date', 'number', 'select', 'multiselect', 'checkbox']),
  section: z.string(),
  placeholder: z.string().optional(),
})
type AddFieldForm = z.infer<typeof addFieldSchema>

function AddFieldModal({ listId, onClose }: { listId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<AddFieldForm>({
    resolver: zodResolver(addFieldSchema),
    defaultValues: { field_type: 'text', section: 'general' },
  })

  const mutation = useMutation({
    mutationFn: (data: AddFieldForm) => contactsApi.createField(listId, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', listId] })
      onClose()
    },
  })

  const labelValue = watch('label')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Přidat vlastní pole</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="label">Název pole (interní klíč)</label>
            <input
              {...register('name')}
              className={`input font-mono text-sm ${errors.name ? 'input-error' : ''}`}
              placeholder="moje_pole"
            />
            <p className="text-xs text-zinc-400 mt-1">Pouze malá písmena, číslice a podtržítko. Např: <code>oblibena_kapela</code></p>
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Popisek pole (zobrazovaný název)</label>
            <input
              {...register('label')}
              className={`input ${errors.label ? 'input-error' : ''}`}
              placeholder="Oblíbená kapela"
            />
            {errors.label && <p className="error-text">{errors.label.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Typ pole</label>
              <select {...register('field_type')} className="input">
                {fieldTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sekce</label>
              <select {...register('section')} className="input">
                {sections.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Nápověda / placeholder <span className="text-zinc-400 font-normal">(nepovinné)</span></label>
            <input {...register('placeholder')} className="input" placeholder="Zobrazí se jako šedý text uvnitř pole…" />
          </div>

          {mutation.isError && (
            <p className="error-text">{(mutation.error as any)?.response?.data?.error ?? 'Chyba při přidávání pole'}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Zrušit</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Přidává se…' : 'Přidat pole'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ListSettings() {
  const { listId } = useParams<{ listId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddField, setShowAddField] = useState(false)

  const { data: listData } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getOne(listId!).then(r => r.data.list),
    enabled: !!listId,
  })

  const { data: fieldsData } = useQuery({
    queryKey: ['fields', listId],
    queryFn: () => contactsApi.getFields(listId!).then(r => r.data.fields),
    enabled: !!listId,
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: string) => contactsApi.deleteField(listId!, fieldId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fields', listId] }),
  })

  const deleteListMutation = useMutation({
    mutationFn: () => listsApi.delete(listId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      navigate('/dashboard')
    },
  })

  const fields = fieldsData ?? []

  const sectionLabels: Record<string, string> = {
    contact: 'Kontaktní údaje',
    professional: 'Profesní informace',
    goals: 'Cíle',
    personal: 'Osobní informace',
    notes: 'Poznámky',
    general: 'Obecné',
  }

  const grouped = fields.reduce<Record<string, FieldDefinition[]>>((acc, f) => {
    if (!acc[f.section]) acc[f.section] = []
    acc[f.section].push(f)
    return acc
  }, {})

  return (
    <Layout maxWidth="lg">
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/lists/${listId}`} className="btn-ghost p-2 text-zinc-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Nastavení seznamu</h1>
          <p className="text-sm text-zinc-500">{listData?.name}</p>
        </div>
      </div>

      {/* Správa polí */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-zinc-900">Pole kontaktu</h2>
            <p className="text-sm text-zinc-500">Spravuj, která pole se zobrazí u každého kontaktu v tomto seznamu.</p>
          </div>
          <button onClick={() => setShowAddField(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Přidat pole
          </button>
        </div>

        {Object.entries(grouped).map(([section, sFields]) => (
          <div key={section} className="mb-5">
            <div className="section-title">{sectionLabels[section] ?? section}</div>
            <div className="space-y-2">
              {sFields.map((field) => (
                <div key={field.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg group">
                  <GripVertical className="w-4 h-4 text-zinc-300" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-zinc-900">{field.label}</span>
                      {field.is_built_in && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">šablona</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {fieldTypes.find(t => t.value === field.field_type)?.label ?? field.field_type}
                      {' · '}<code>{field.name}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Smazat pole "${field.label}"? Data uložená v tomto poli zůstanou zachována, ale pole se přestane zobrazovat.`)) {
                        deleteFieldMutation.mutate(field.id)
                      }
                    }}
                    className="btn-ghost p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">Tento seznam nemá žádná pole. Přidej první vlastní pole.</p>
        )}
      </div>

      {/* Nebezpečná zóna */}
      <div className="card p-6 border-red-200">
        <h2 className="font-semibold text-zinc-900 mb-1">Nebezpečná zóna</h2>
        <p className="text-sm text-zinc-500 mb-4">Tyto akce jsou nevratné. Buď opatrný/á.</p>
        <button
          onClick={() => {
            if (confirm(`Opravdu smazat celý seznam "${listData?.name}" a všechny jeho kontakty? Tuto akci nelze vrátit.`)) {
              deleteListMutation.mutate()
            }
          }}
          className="btn-danger"
        >
          <Trash2 className="w-4 h-4" /> Smazat celý seznam
        </button>
      </div>

      {showAddField && <AddFieldModal listId={listId!} onClose={() => setShowAddField(false)} />}
    </Layout>
  )
}
