import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Square, Trash2, Plus, Loader2, Clock } from 'lucide-react'
import { tasksApi, type Task, type TaskInput } from '@/api/tasks'
import { apiClient } from '@/api/client'

function formatDue(dateStr: string | null | undefined): { label: string; urgent: boolean } {
  if (!dateStr) return { label: '', urgent: false }
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / 86400000)
  const hasTime = dateStr.includes('T') && !dateStr.endsWith('T00:00:00.000Z')

  if (diffDays < 0) return { label: `${Math.abs(diffDays)} dní po termínu`, urgent: true }
  if (diffDays === 0) {
    if (hasTime) return { label: `Dnes ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`, urgent: true }
    return { label: 'Dnes', urgent: true }
  }
  if (diffDays === 1) {
    if (hasTime) return { label: `Zítra ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`, urgent: true }
    return { label: 'Zítra', urgent: true }
  }
  if (diffDays <= 7) {
    const base = `Za ${diffDays} dní`
    if (hasTime) return { label: `${base} · ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`, urgent: false }
    return { label: base, urgent: false }
  }
  const dateLabel = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
  if (hasTime) return { label: `${dateLabel} · ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`, urgent: false }
  return { label: dateLabel, urgent: false }
}

// Lokální datum+čas → ISO string pro backend
function localDateTimeToISO(local: string): string | null {
  if (!local) return null
  // datetime-local formát: "YYYY-MM-DDTHH:MM"
  return new Date(local).toISOString()
}


interface AllContact { id: string; first_name: string; last_name?: string | null; list_id: string; list_name: string }

interface AddTaskFormProps {
  contactId?: string
  onDone: () => void
}

export function AddTaskForm({ contactId, onDone }: AddTaskFormProps) {
  const [title, setTitle] = useState('')
  const [dueDateTime, setDueDateTime] = useState('')
  const [selectedContact, setSelectedContact] = useState(contactId ?? '')
  const queryClient = useQueryClient()

  // Načti kontakty pro dropdown (jen pokud není předán contactId)
  const { data: allContactsData } = useQuery({
    queryKey: ['all-contacts-for-task'],
    queryFn: () => apiClient.get<{ contacts: AllContact[] }>('/contacts/all').then(r => r.data.contacts),
    enabled: !contactId,
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: (data: TaskInput) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setTitle('')
      setDueDateTime('')
      onDone()
    },
  })

  const submit = () => {
    if (!title.trim() || !selectedContact) return
    createMutation.mutate({
      contact_id: selectedContact,
      title: title.trim(),
      due_date: localDateTimeToISO(dueDateTime),
    })
  }

  const contacts = allContactsData ?? []

  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
      {!contactId && (
        <select
          value={selectedContact}
          onChange={e => setSelectedContact(e.target.value)}
          className="input text-sm py-1.5"
        >
          <option value="">— Vybrat kontakt —</option>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>
              {[c.first_name, c.last_name].filter(Boolean).join(' ')} · {c.list_name}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Co je třeba udělat?"
        className="input text-sm py-1.5"
        autoFocus
      />
      <div className="flex gap-2">
        <input
          type="datetime-local"
          value={dueDateTime}
          onChange={e => setDueDateTime(e.target.value)}
          className="input text-sm py-1.5 flex-1"
        />
        <button
          onClick={submit}
          disabled={!title.trim() || !selectedContact || createMutation.isPending}
          className="btn-primary text-sm py-1.5 px-4"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Přidat'}
        </button>
        <button onClick={onDone} className="btn-ghost text-sm text-zinc-500 px-3">Zrušit</button>
      </div>
    </div>
  )
}

function TaskRow({ task, showContact = false }: { task: Task; showContact?: boolean }) {
  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: () => tasksApi.toggleComplete(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const due = formatDue(task.due_date)

  return (
    <div className={`flex items-start gap-3 py-2.5 border-b border-zinc-100 last:border-0 group ${task.is_completed ? 'opacity-50' : ''}`}>
      <button
        onClick={() => toggleMutation.mutate()}
        disabled={toggleMutation.isPending}
        className="shrink-0 mt-0.5 text-zinc-400 hover:text-primary-600 transition-colors"
      >
        {task.is_completed
          ? <CheckSquare className="w-4.5 h-4.5 text-primary-500" />
          : <Square className="w-4.5 h-4.5" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.is_completed ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
          {task.title}
        </p>
        {showContact && task.first_name && (
          <Link
            to={`/lists/${task.list_id}/contacts/${task.contact_id}`}
            className="text-xs text-primary-600 hover:underline"
          >
            {[task.first_name, task.last_name].filter(Boolean).join(' ')}
          </Link>
        )}
        {due.label && (
          <span className={`text-xs flex items-center gap-1 mt-0.5 ${due.urgent ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
            <Clock className="w-3 h-3" /> {due.label}
          </span>
        )}
      </div>

      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-300 hover:text-red-500"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

interface TaskListProps {
  contactId?: string
  showContact?: boolean
  title?: string
  compact?: boolean
}

export default function TaskList({ contactId, showContact = false, title = 'Úkoly', compact = false }: TaskListProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const { data: activeTasks } = useQuery({
    queryKey: ['tasks', 'active', contactId],
    queryFn: () => tasksApi.getAll(false).then(r =>
      contactId ? r.data.tasks.filter(t => t.contact_id === contactId) : r.data.tasks
    ),
  })

  const { data: completedTasks } = useQuery({
    queryKey: ['tasks', 'completed', contactId],
    queryFn: () => tasksApi.getAll(true).then(r =>
      contactId ? r.data.tasks.filter(t => t.contact_id === contactId) : r.data.tasks
    ),
    enabled: showCompleted,
  })

  const tasks = activeTasks ?? []
  const done = completedTasks ?? []

  if (compact && tasks.length === 0 && !showAdd) {
    return (
      <button onClick={() => setShowAdd(true)} className="text-xs text-zinc-400 hover:text-primary-600 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Přidat úkol
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-primary-500" />
          {title}
          {tasks.length > 0 && (
            <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
          )}
        </h3>
        <button onClick={() => setShowAdd(s => !s)} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Přidat
        </button>
      </div>

      {showAdd && (
        <div className="mb-3">
          <AddTaskForm contactId={contactId} onDone={() => setShowAdd(false)} />
        </div>
      )}

      {tasks.length === 0 && !showAdd ? (
        <p className="text-xs text-zinc-400 py-2">Žádné aktivní úkoly</p>
      ) : (
        tasks.map(t => <TaskRow key={t.id} task={t} showContact={showContact} />)
      )}

      <button
        onClick={() => setShowCompleted(s => !s)}
        className="text-xs text-zinc-400 hover:text-zinc-600 mt-2"
      >
        {showCompleted ? '▲ Skrýt splněné' : `▼ Zobrazit splněné`}
      </button>

      {showCompleted && done.map(t => <TaskRow key={t.id} task={t} showContact={showContact} />)}
    </div>
  )
}
