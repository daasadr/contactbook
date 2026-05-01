import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Network, Briefcase, Heart, Settings2, Trash2, BookUser, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Layout from '@/components/Layout'
import { listsApi } from '@/api/lists'
import { useAuthStore } from '@/stores/auth'
import type { ContactList, TemplateMeta } from '@/types'

const iconMap: Record<string, React.ReactNode> = {
  network: <Network className="w-5 h-5" />,
  briefcase: <Briefcase className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  settings: <Settings2 className="w-5 h-5" />,
}

const createSchema = z.object({
  name: z.string().min(1, 'Název je povinný').max(255),
  description: z.string().max(1000).optional(),
  template_type: z.string(),
})
type CreateForm = z.infer<typeof createSchema>

function CreateListModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'template' | 'name'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null)

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => listsApi.getTemplates().then(r => r.data.templates),
  })

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { template_type: 'general' },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => listsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      onClose()
    },
  })

  const selectTemplate = (t: TemplateMeta) => {
    setSelectedTemplate(t)
    setValue('template_type', t.type)
    setValue('name', t.label)
    setStep('name')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
          <h2 className="text-lg font-semibold text-zinc-900">
            {step === 'template' ? 'Vyber šablonu seznamu' : 'Pojmenuj svůj seznam'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
        </div>

        {step === 'template' && (
          <div className="p-6">
            <p className="text-sm text-zinc-500 mb-4">Šablona určuje předpřipravená pole — vždy je můžeš upravit.</p>
            <div className="grid grid-cols-2 gap-3">
              {(templatesData ?? []).map((t) => (
                <button
                  key={t.type}
                  onClick={() => selectTemplate(t)}
                  className="text-left p-4 rounded-xl border-2 border-zinc-200 hover:border-primary-400 hover:bg-primary-50 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: t.color + '20', color: t.color }}>
                    {iconMap[t.icon] ?? <Users className="w-5 h-5" />}
                  </div>
                  <div className="font-medium text-zinc-900 text-sm">{t.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'name' && selectedTemplate && (
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedTemplate.color + '20', color: selectedTemplate.color }}>
                {iconMap[selectedTemplate.icon] ?? <Users className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs text-zinc-500">Šablona</div>
                <div className="text-sm font-medium text-zinc-900">{selectedTemplate.label}</div>
              </div>
              <button type="button" onClick={() => setStep('template')} className="ml-auto text-xs text-primary-600 hover:underline">Změnit</button>
            </div>

            <div>
              <label className="label">Název seznamu</label>
              <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Např. Moji klienti, Networking 2026..." />
              {errors.name && <p className="error-text">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Popis <span className="text-zinc-400 font-normal">(nepovinné)</span></label>
              <input {...register('description')} className="input" placeholder="Krátký popis tohoto seznamu..." />
            </div>

            {createMutation.isError && (
              <p className="error-text">{(createMutation.error as any)?.response?.data?.error ?? 'Chyba při vytváření'}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Zrušit</button>
              <button type="submit" disabled={isSubmitting || createMutation.isPending} className="btn-primary flex-1">
                {createMutation.isPending ? 'Vytváří se…' : 'Vytvořit seznam'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const [showCreate, setShowCreate] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => listsApi.getAll().then(r => r.data.lists),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => listsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  })

  const handleDelete = (list: ContactList) => {
    if (confirm(`Opravdu smazat seznam "${list.name}" a všechny jeho kontakty?`)) {
      deleteMutation.mutate(list.id)
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Moje seznamy</h1>
          <p className="text-zinc-500 text-sm mt-1">Vítej zpět, {user?.name} 👋</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nový seznam
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.length ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookUser className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Zatím žádné seznamy</h2>
          <p className="text-zinc-500 text-sm mb-6">Vytvoř svůj první seznam kontaktů a začni organizovat svůj sociální život.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Vytvořit první seznam
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((list) => (
            <div key={list.id} className="card hover:shadow-md transition-all group relative">
              <Link to={`/lists/${list.id}`} className="block p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: list.color + '20', color: list.color }}>
                    {iconMap[list.icon] ?? <Users className="w-5 h-5" />}
                  </div>
                  <span className="text-xs text-zinc-400 bg-zinc-100 rounded-full px-2.5 py-1">
                    {list.contact_count} {list.contact_count === 1 ? 'kontakt' : list.contact_count < 5 ? 'kontakty' : 'kontaktů'}
                  </span>
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">{list.name}</h3>
                {list.description && <p className="text-sm text-zinc-500 line-clamp-2">{list.description}</p>}
              </Link>
              <div className="absolute top-3 right-3 hidden group-hover:flex items-center gap-1">
                <Link to={`/lists/${list.id}/settings`} className="btn-ghost p-1.5 text-zinc-400 hover:text-zinc-700">
                  <Settings2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(list)}
                  className="btn-ghost p-1.5 text-zinc-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowCreate(true)}
            className="card border-dashed border-2 border-zinc-300 hover:border-primary-400 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 p-6 text-zinc-400 hover:text-primary-600 min-h-[140px]"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Nový seznam</span>
          </button>
        </div>
      )}

      {showCreate && <CreateListModal onClose={() => setShowCreate(false)} />}
    </Layout>
  )
}
