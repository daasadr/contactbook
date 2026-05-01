import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Star, Settings2, ArrowLeft, User, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Layout from '@/components/Layout'
import { listsApi } from '@/api/lists'
import { contactsApi } from '@/api/contacts'
import type { Contact } from '@/types'
import clsx from 'clsx'

const createContactSchema = z.object({
  first_name: z.string().min(1, 'Jméno je povinné').max(255),
  last_name: z.string().max(255).optional(),
})
type CreateContactForm = z.infer<typeof createContactSchema>

function CreateContactModal({ listId, onClose }: { listId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateContactForm>({
    resolver: zodResolver(createContactSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: CreateContactForm) => contactsApi.create(listId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Přidat kontakt</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="label">Jméno *</label>
            <input {...register('first_name')} className={`input ${errors.first_name ? 'input-error' : ''}`} placeholder="Jana" autoFocus />
            {errors.first_name && <p className="error-text">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="label">Příjmení</label>
            <input {...register('last_name')} className="input" placeholder="Nováková" />
          </div>
          {mutation.isError && (
            <p className="error-text">{(mutation.error as any)?.response?.data?.error ?? 'Chyba při přidávání'}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Zrušit</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Přidává se…' : 'Přidat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ContactCard({ contact, listId }: { contact: Contact; listId: string }) {
  const queryClient = useQueryClient()

  const starMutation = useMutation({
    mutationFn: () => contactsApi.toggleStar(listId, contact.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', listId] }),
  })

  const initials = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('')

  return (
    <div className="card flex items-center gap-4 p-4 hover:shadow-md transition-all group">
      <Link to={`/lists/${listId}/contacts/${contact.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
          {initials || <User className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 truncate">
            {contact.first_name} {contact.last_name}
          </div>
          {contact.custom_data?.email && (
            <div className="text-sm text-zinc-500 truncate">{String(contact.custom_data.email)}</div>
          )}
          {!contact.custom_data?.email && contact.custom_data?.phone && (
            <div className="text-sm text-zinc-500 truncate">{String(contact.custom_data.phone)}</div>
          )}
          {!contact.custom_data?.email && !contact.custom_data?.phone && contact.custom_data?.company && (
            <div className="text-sm text-zinc-500 truncate">{String(contact.custom_data.company)}</div>
          )}
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); starMutation.mutate() }}
        className={clsx('p-1.5 rounded-lg transition-colors', contact.is_starred ? 'text-yellow-500' : 'text-zinc-300 hover:text-yellow-400 opacity-0 group-hover:opacity-100')}
      >
        <Star className={clsx('w-4 h-4', contact.is_starred && 'fill-yellow-500')} />
      </button>
    </div>
  )
}

export default function ListDetail() {
  const { listId } = useParams<{ listId: string }>()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)

  const { data: listData } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getOne(listId!).then(r => r.data.list),
    enabled: !!listId,
  })

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts', listId, search, starredOnly],
    queryFn: () => contactsApi.getAll(listId!, { search: search || undefined, starred: starredOnly || undefined }).then(r => r.data.contacts),
    enabled: !!listId,
  })

  const list = listData

  return (
    <Layout>
      {/* Hlavička */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard" className="btn-ghost p-2 text-zinc-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-900 truncate">{list?.name ?? '…'}</h1>
          {list?.description && <p className="text-sm text-zinc-500 truncate">{list.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/lists/${listId}/settings`} className="btn-secondary gap-2">
            <Settings2 className="w-4 h-4" /> Nastavení
          </Link>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Přidat
          </button>
        </div>
      </div>

      {/* Vyhledávání a filtry */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Hledat v kontaktech…"
          />
        </div>
        <button
          onClick={() => setStarredOnly(!starredOnly)}
          className={clsx('btn gap-2', starredOnly ? 'btn-primary' : 'btn-secondary')}
        >
          <Star className={clsx('w-4 h-4', starredOnly && 'fill-white')} />
          Oblíbení
        </button>
      </div>

      {/* Seznam kontaktů */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !contactsData?.length ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <User className="w-7 h-7 text-zinc-400" />
          </div>
          <h3 className="font-medium text-zinc-900 mb-1">
            {search || starredOnly ? 'Žádné výsledky' : 'Zatím žádné kontakty'}
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            {search ? `Nic nenalezeno pro "${search}"` : starredOnly ? 'Žádné oblíbené kontakty' : 'Přidej první kontakt do tohoto seznamu.'}
          </p>
          {!search && !starredOnly && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Přidat kontakt
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500 mb-3">{contactsData.length} kontaktů</p>
          {contactsData.map((c) => (
            <ContactCard key={c.id} contact={c} listId={listId!} />
          ))}
        </div>
      )}

      {showCreate && <CreateContactModal listId={listId!} onClose={() => setShowCreate(false)} />}
    </Layout>
  )
}
