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
import BackgroundPicker, { isBgDark } from '@/components/BackgroundPicker'
import SignalWidget from '@/components/SignalWidget'
import TaskList from '@/components/TaskList'
import type { ContactList, TemplateMeta } from '@/types'

const iconMap: Record<string, React.ReactNode> = {
  network: <Network className="w-5 h-5" />,
  briefcase: <Briefcase className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  settings: <Settings2 className="w-5 h-5" />,
}

function getHeaderBgStyle(list: ContactList): React.CSSProperties {
  const bg = list.background
  if (!bg) return { backgroundColor: list.color + '28' }
  if (bg.startsWith('linear-gradient')) return { backgroundImage: bg }
  return { backgroundColor: bg }
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
  const [selectedBg, setSelectedBg] = useState<string | null>(null)

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => listsApi.getTemplates().then(r => r.data.templates),
  })

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { template_type: 'general' },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => listsApi.create({ ...data, background: selectedBg }),
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
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

            {/* Background picker */}
            <div>
              <label className="label">Pozadí karty</label>
              <BackgroundPicker value={selectedBg} onChange={setSelectedBg} />
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
    <Layout bgImage="/peopleworth2.jpg">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
          >
            Moje seznamy
          </h1>
          <p
            className="text-sm text-white/75 font-light tracking-wide mt-1"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
          >
            Vítej zpět, {user?.name} 👋
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nový seznam
        </button>
      </div>

      {/* Signál widget */}
      <SignalWidget />

      {/* Úkoly */}
      {(data?.length ?? 0) > 0 && (
        <div className="card p-5 bg-white/90 backdrop-blur-sm mb-6">
          <TaskList showContact title="Nadcházející úkoly" />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.length ? (
        <div className="text-center py-20 bg-white/70 backdrop-blur-sm rounded-2xl">
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
          {data.map((list) => {
            const hasBg = !!list.background
            const dark = isBgDark(list.background)
            return (
              <div key={list.id} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group relative bg-white/85 backdrop-blur-sm">
                <Link to={`/lists/${list.id}`} className="block">
                  {/* Colored header band */}
                  <div
                    className="h-20 flex items-start justify-between p-4"
                    style={getHeaderBgStyle(list)}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: hasBg ? 'rgba(255,255,255,0.3)' : list.color + '20',
                        color: hasBg ? (dark ? '#ffffff' : list.color) : list.color,
                      }}
                    >
                      {iconMap[list.icon] ?? <Users className="w-5 h-5" />}
                    </div>
                    <span
                      className="text-xs rounded-full px-2.5 py-1 font-medium"
                      style={{
                        backgroundColor: hasBg ? 'rgba(255,255,255,0.3)' : '#f4f4f5',
                        color: hasBg ? (dark ? '#ffffff' : '#3f3f46') : '#71717a',
                      }}
                    >
                      {list.contact_count} {list.contact_count === 1 ? 'kontakt' : list.contact_count < 5 ? 'kontakty' : 'kontaktů'}
                    </span>
                  </div>
                  {/* Content area */}
                  <div className="px-4 py-3">
                    <h3 className="font-semibold text-zinc-900 mb-0.5">{list.name}</h3>
                    {list.description && <p className="text-sm text-zinc-500 line-clamp-2">{list.description}</p>}
                  </div>
                </Link>
                <div className="absolute top-3 right-3 hidden group-hover:flex items-center gap-1">
                  <Link
                    to={`/lists/${list.id}/settings`}
                    className="p-1.5 rounded-lg transition-colors hover:text-zinc-700"
                    style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#71717a' }}
                  >
                    <Settings2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(list)}
                    className="p-1.5 rounded-lg transition-colors hover:text-red-600"
                    style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#71717a' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-2xl border-dashed border-2 border-white/60 hover:border-primary-400 bg-white/50 backdrop-blur-sm hover:bg-primary-50/70 transition-all flex items-center justify-center gap-2 p-6 text-white hover:text-primary-600 min-h-[140px] drop-shadow-sm"
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
