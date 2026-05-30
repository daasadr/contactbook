import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, PenLine, Trash2, Tag, Calendar, Camera, Loader2, X } from 'lucide-react'
import Layout from '@/components/Layout'
import { contactsApi } from '@/api/contacts'
import { eventsApi, type ContactEvent, type EventAttachment, type EventInput } from '@/api/events'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr: string) {
  const d = dateStr.slice(0, 10)
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

interface FormState {
  title: string
  content: string
  event_date: string
  tagsInput: string
}

function EventForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<FormState>
  onSave: (data: EventInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>({
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    event_date: initial?.event_date ?? todayStr(),
    tagsInput: initial?.tagsInput ?? '',
  })

  const field = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = () => {
    if (!form.content.trim()) return
    const tags = form.tagsInput
      ? form.tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      : undefined
    onSave({
      title: form.title.trim() || undefined,
      content: form.content.trim(),
      event_date: form.event_date || null,
      tags,
    })
  }

  return (
    <div className="card p-5 bg-white/95 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Datum</label>
          <input type="date" value={form.event_date} onChange={field('event_date')} className="input" />
        </div>
        <div>
          <label className="label">
            Název <span className="font-normal text-zinc-400">(nepovinný)</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={field('title')}
            placeholder="Hovořili jsme o…"
            className="input"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="label">Obsah zápisku *</label>
        <textarea
          value={form.content}
          onChange={field('content')}
          placeholder="Co se stalo? Co jsme probírali? Jaké byly výsledky?"
          rows={4}
          className="input resize-none"
          autoFocus
        />
      </div>
      <div className="mb-4">
        <label className="label">
          Štítky <span className="font-normal text-zinc-400">(oddělené čárkou)</span>
        </label>
        <input
          type="text"
          value={form.tagsInput}
          onChange={field('tagsInput')}
          placeholder="setkání, práce, osobní"
          className="input"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-zinc-500">Zrušit</button>
        <button onClick={submit} disabled={!form.content.trim() || saving} className="btn-primary">
          {saving ? 'Ukládám…' : 'Uložit zápis'}
        </button>
      </div>
    </div>
  )
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/20"
        title="Zavřít (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image — click on it does NOT close */}
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
      />
    </div>
  )
}

function AttachmentGallery({
  attachments,
  onDelete,
  deleting,
}: {
  attachments: EventAttachment[]
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const [lightbox, setLightbox] = useState<EventAttachment | null>(null)

  if (attachments.length === 0) return null
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {attachments.map(att => (
          <div key={att.id} className="relative group/photo">
            <button onClick={() => setLightbox(att)} className="focus:outline-none">
              <img
                src={`/uploads/${att.filename}`}
                alt={att.original_name}
                className="w-24 h-24 object-cover rounded-lg border border-zinc-200 hover:opacity-90 transition-opacity cursor-zoom-in"
              />
            </button>
            <button
              onClick={() => onDelete(att.id)}
              disabled={deleting === att.id}
              title="Odstranit foto"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-600"
            >
              {deleting === att.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <X className="w-3 h-3" />
              }
            </button>
          </div>
        ))}
      </div>

      {lightbox && (
        <Lightbox
          src={`/uploads/${lightbox.filename}`}
          alt={lightbox.original_name}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}

function EventCard({ event, listId, contactId }: { event: ContactEvent; listId: string; contactId: string }) {
  const [editing, setEditing] = useState(false)
  const [deletingAtt, setDeletingAtt] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (data: EventInput) => eventsApi.update(listId, contactId, event.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', contactId] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.delete(listId, contactId, event.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', contactId] }),
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      await eventsApi.uploadAttachment(listId, contactId, event.id, file)
      queryClient.invalidateQueries({ queryKey: ['events', contactId] })
    } catch (err: any) {
      setUploadError(err.response?.data?.error ?? 'Nahrávání selhalo.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    setDeletingAtt(attachmentId)
    try {
      await eventsApi.deleteAttachment(listId, contactId, event.id, attachmentId)
      queryClient.invalidateQueries({ queryKey: ['events', contactId] })
    } catch {
      // ignore
    } finally {
      setDeletingAtt(null)
    }
  }

  if (editing) {
    return (
      <EventForm
        initial={{
          title: event.title ?? '',
          content: event.content,
          event_date: event.event_date ? event.event_date.slice(0, 10) : '',
          tagsInput: (event.tags ?? []).join(', '),
        }}
        onSave={data => updateMutation.mutate(data)}
        onCancel={() => setEditing(false)}
        saving={updateMutation.isPending}
      />
    )
  }

  return (
    <div className="card p-5 bg-white/90 backdrop-blur-sm group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          {event.event_date ? formatDate(event.event_date) : 'Bez data'}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditing(true)}
            title="Upravit"
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { if (confirm('Smazat tento zápis?')) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending}
            title="Smazat"
            className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {event.title && (
        <h3 className="font-semibold text-zinc-900 mb-2">{event.title}</h3>
      )}

      <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{event.content}</p>

      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {event.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <AttachmentGallery
        attachments={event.attachments ?? []}
        onDelete={handleDeleteAttachment}
        deleting={deletingAtt}
      />

      <div className="mt-3 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary-600 transition-colors"
        >
          {uploading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Nahrávám…</>
            : <><Camera className="w-3.5 h-3.5" /> Přidat foto</>
          }
        </button>
        {uploadError && <span className="text-xs text-red-500">{uploadError}</span>}
      </div>
    </div>
  )
}

export default function ContactEvents() {
  const { listId, contactId } = useParams<{ listId: string; contactId: string }>()
  const [showAdd, setShowAdd] = useState(false)
  const queryClient = useQueryClient()

  const { data: contactData } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getOne(listId!, contactId!).then(r => r.data.contact),
    enabled: !!listId && !!contactId,
  })

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', contactId],
    queryFn: () => eventsApi.getAll(listId!, contactId!).then(r => r.data.events),
    enabled: !!listId && !!contactId,
  })

  const createMutation = useMutation({
    mutationFn: (data: EventInput) => eventsApi.create(listId!, contactId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', contactId] })
      setShowAdd(false)
    },
  })

  const fullName = [contactData?.first_name, contactData?.last_name].filter(Boolean).join(' ')
  const events = eventsData ?? []

  return (
    <Layout maxWidth="2xl" bgImage="/peopleworth.jpg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/lists/${listId}/contacts/${contactId}`}
          className="btn-ghost p-2 text-zinc-600 bg-white/80 hover:bg-white rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-900">Kniha záznamů</h1>
          {fullName && <p className="text-sm text-zinc-500">{fullName}</p>}
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Přidat zápis
          </button>
        )}
      </div>

      {showAdd && (
        <EventForm
          onSave={data => createMutation.mutate(data)}
          onCancel={() => setShowAdd(false)}
          saving={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4">
            <PenLine className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">Žádné zápisky</h2>
          <p className="text-zinc-600 max-w-xs mb-6">
            Zaznamenej si, co s {fullName || 'kontaktem'} probíráte, jak se vede nebo co si nesmíš zapomenout.
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Přidat první zápis
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <EventCard key={event.id} event={event} listId={listId!} contactId={contactId!} />
          ))}
        </div>
      )}
    </Layout>
  )
}
