import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, PenLine, Trash2, Tag, Calendar,
  Camera, Loader2, X, ChevronLeft, ChevronRight, Image as ImageIcon,
} from 'lucide-react'
import Layout from '@/components/Layout'
import { contactsApi } from '@/api/contacts'
import { eventsApi, type ContactEvent, type EventAttachment, type EventInput } from '@/api/events'

const PREVIEW_CHARS = 160
const ENTRIES_PER_SIDE = 2

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

// ── Event form (add / edit) ────────────────────────────────────────────────

interface FormState { title: string; content: string; event_date: string; tagsInput: string }

function EventForm({ initial, onSave, onCancel, saving }: {
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
  const field = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    if (!form.content.trim()) return
    const tags = form.tagsInput ? form.tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined
    onSave({ title: form.title.trim() || undefined, content: form.content.trim(), event_date: form.event_date || null, tags })
  }

  return (
    <div className="card p-5 bg-white/95 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Datum</label>
          <input type="date" value={form.event_date} onChange={field('event_date')} className="input" />
        </div>
        <div>
          <label className="label">Název <span className="font-normal text-zinc-400">(nepovinný)</span></label>
          <input type="text" value={form.title} onChange={field('title')} placeholder="Hovořili jsme o…" className="input" />
        </div>
      </div>
      <div className="mb-3">
        <label className="label">Obsah zápisku *</label>
        <textarea value={form.content} onChange={field('content')} placeholder="Co se stalo? Co jsme probírali?" rows={4} className="input resize-none" autoFocus />
      </div>
      <div className="mb-4">
        <label className="label">Štítky <span className="font-normal text-zinc-400">(oddělené čárkou)</span></label>
        <input type="text" value={form.tagsInput} onChange={field('tagsInput')} placeholder="setkání, práce, osobní" className="input" />
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

// ── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <button onClick={onClose} title="Zavřít (Esc)"
        className="fixed top-5 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 via-stone-500 to-teal-400 text-white flex items-center justify-center ring-2 ring-white/30 hover:scale-110 active:scale-95 transition-all duration-150"
        style={{ boxShadow: '0 5px 0 #3d2c1e, 0 8px 24px rgba(45,212,191,0.55)' }}>
        <X className="w-6 h-6" strokeWidth={2.5} />
      </button>
      <img src={src} alt={alt} onClick={e => e.stopPropagation()} className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl" />
    </div>,
    document.body,
  )
}

// ── Attachment gallery ─────────────────────────────────────────────────────

function AttachmentGallery({ attachments, onDelete, deleting }: {
  attachments: EventAttachment[]
  onDelete: (id: string) => void
  deleting: string | null
}) {
  const [lightbox, setLightbox] = useState<EventAttachment | null>(null)
  if (attachments.length === 0) return null
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map(att => (
          <div key={att.id} className="relative group/photo">
            <button onClick={() => setLightbox(att)} className="focus:outline-none">
              <img src={`/uploads/${att.filename}`} alt={att.original_name}
                className="w-20 h-20 object-cover rounded-md border border-stone-200 hover:opacity-90 transition-opacity cursor-zoom-in" />
            </button>
            <button onClick={() => onDelete(att.id)} disabled={deleting === att.id} title="Odstranit"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-600">
              {deleting === att.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            </button>
          </div>
        ))}
      </div>
      {lightbox && <Lightbox src={`/uploads/${lightbox.filename}`} alt={lightbox.original_name} onClose={() => setLightbox(null)} />}
    </>
  )
}

// ── Single book entry ──────────────────────────────────────────────────────

function BookEntry({ event, listId, contactId, expanded, onToggle }: {
  event: ContactEvent; listId: string; contactId: string
  expanded: boolean; onToggle: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [deletingAtt, setDeletingAtt] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (data: EventInput) => eventsApi.update(listId, contactId, event.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events', contactId] }); setEditing(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.delete(listId, contactId, event.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', contactId] }),
  })
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    setUploadError(''); setUploading(true)
    try {
      await eventsApi.uploadAttachment(listId, contactId, event.id, file)
      queryClient.invalidateQueries({ queryKey: ['events', contactId] })
    } catch (err: any) {
      setUploadError(err.response?.data?.error ?? 'Nahrávání selhalo.')
    } finally { setUploading(false) }
  }
  const handleDeleteAtt = async (id: string) => {
    setDeletingAtt(id)
    try { await eventsApi.deleteAttachment(listId, contactId, event.id, id); queryClient.invalidateQueries({ queryKey: ['events', contactId] }) }
    catch { /* ignore */ } finally { setDeletingAtt(null) }
  }

  if (editing) {
    return (
      <div className="mb-4">
        <EventForm
          initial={{ title: event.title ?? '', content: event.content, event_date: event.event_date?.slice(0, 10) ?? '', tagsInput: (event.tags ?? []).join(', ') }}
          onSave={data => updateMutation.mutate(data)}
          onCancel={() => setEditing(false)}
          saving={updateMutation.isPending}
        />
      </div>
    )
  }

  const needsExpand = event.content.length > PREVIEW_CHARS || (event.attachments?.length ?? 0) > 0
  const preview = needsExpand && !expanded ? event.content.slice(0, PREVIEW_CHARS) + '…' : event.content

  return (
    <article className="group/entry mb-5 last:mb-0 pb-4 last:pb-0 border-b border-stone-200/60 last:border-0">
      {/* Header row */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium leading-tight">
          <Calendar className="inline w-2.5 h-2.5 mr-0.5 -mt-0.5" />
          {event.event_date ? formatDate(event.event_date) : 'Bez data'}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/entry:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setEditing(true)} title="Upravit"
            className="p-1 rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100">
            <PenLine className="w-3 h-3" />
          </button>
          <button onClick={() => { if (confirm('Smazat tento zápis?')) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending} title="Smazat"
            className="p-1 rounded text-stone-300 hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {event.title && <p className="text-xs font-semibold text-stone-800 mb-1">{event.title}</p>}

      <p className="text-[11px] text-stone-600 leading-[1.6] whitespace-pre-wrap">{preview}</p>

      {/* Tags — only expanded */}
      {expanded && event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.tags.map(t => (
            <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[10px]">
              <Tag className="w-2.5 h-2.5" />{t}
            </span>
          ))}
        </div>
      )}

      {/* Photos — only expanded */}
      {expanded && (
        <AttachmentGallery attachments={event.attachments ?? []} onDelete={handleDeleteAtt} deleting={deletingAtt} />
      )}

      {/* Footer: photo count + upload + expand toggle */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-2">
          {!expanded && (event.attachments?.length ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-stone-400">
              <ImageIcon className="w-2.5 h-2.5" />{event.attachments!.length}
            </span>
          )}
          {expanded && (
            <>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-0.5 text-[10px] text-stone-400 hover:text-primary-600">
                {uploading ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Nahrávám…</> : <><Camera className="w-2.5 h-2.5" /> Přidat foto</>}
              </button>
              {uploadError && <span className="text-[10px] text-red-500">{uploadError}</span>}
            </>
          )}
        </div>
        {needsExpand && (
          <button onClick={onToggle} className="text-[10px] text-stone-400 hover:text-stone-700 flex items-center gap-0.5">
            {expanded ? 'Méně ↑' : 'Číst dál ↓'}
          </button>
        )}
      </div>
    </article>
  )
}

// ── Single book page ───────────────────────────────────────────────────────

const PAGE_LINES = `repeating-linear-gradient(
  transparent, transparent 27px, #e4ddd4 27px, #e4ddd4 28px
)`

function BookPage({ events, side, pageNum, listId, contactId, expandedIds, onToggle }: {
  events: ContactEvent[]; side: 'left' | 'right'; pageNum: number
  listId: string; contactId: string
  expandedIds: Set<string>; onToggle: (id: string) => void
}) {
  return (
    <div
      className={`flex-1 min-h-[520px] flex flex-col relative overflow-hidden ${side === 'left' ? 'rounded-l' : 'rounded-r'}`}
      style={{ background: `${PAGE_LINES}, #fdf9f0`, backgroundPosition: '0 52px, 0 0' }}
    >
      {/* Top margin line */}
      <div className="h-10 border-b border-red-200/50 shrink-0" />

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-stone-300 text-xs italic select-none">— prázdná strana —</p>
          </div>
        ) : (
          events.map(ev => (
            <BookEntry key={ev.id} event={ev} listId={listId} contactId={contactId}
              expanded={expandedIds.has(ev.id)} onToggle={() => onToggle(ev.id)} />
          ))
        )}
      </div>

      {/* Page number */}
      <div className={`shrink-0 pb-3 px-4 flex ${side === 'left' ? 'justify-start' : 'justify-end'}`}>
        <span className="text-[9px] text-stone-400 font-medium italic">{pageNum}</span>
      </div>
    </div>
  )
}

// ── Open book spread ───────────────────────────────────────────────────────

function BookSpread({ events, listId, contactId }: {
  events: ContactEvent[]; listId: string; contactId: string
}) {
  const [spread, setSpread] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null)

  const perSpread = ENTRIES_PER_SIDE * 2
  const totalSpreads = Math.max(1, Math.ceil(events.length / perSpread))

  const navigate = (dir: 'left' | 'right') => {
    setAnimDir(dir)
    setTimeout(() => {
      setSpread(s => dir === 'left' ? s + 1 : s - 1)
      setAnimDir(null)
    }, 180)
  }

  const spreadEvents = events.slice(spread * perSpread, (spread + 1) * perSpread)
  const leftEvents = spreadEvents.slice(0, ENTRIES_PER_SIDE)
  const rightEvents = spreadEvents.slice(ENTRIES_PER_SIDE, ENTRIES_PER_SIDE * 2)
  const leftPage = spread * 2 + 1
  const rightPage = spread * 2 + 2

  const toggle = (id: string) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const bookStyle = {
    boxShadow: '0 12px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
    opacity: animDir ? 0 : 1,
    transform: animDir === 'left' ? 'translateX(-16px)' : animDir === 'right' ? 'translateX(16px)' : 'none',
    transition: 'opacity 0.18s ease, transform 0.18s ease',
  }

  return (
    <div className="select-none">
      {/* Mobil: jedna stránka se všemi záznamy */}
      <div className="sm:hidden rounded overflow-hidden" style={bookStyle}>
        <BookPage events={spreadEvents} side="left" pageNum={leftPage}
          listId={listId} contactId={contactId} expandedIds={expandedIds} onToggle={toggle} />
      </div>

      {/* Desktop: dvě stránky side by side */}
      <div className="hidden sm:flex rounded overflow-hidden" style={bookStyle}>
        <BookPage events={leftEvents} side="left" pageNum={leftPage}
          listId={listId} contactId={contactId} expandedIds={expandedIds} onToggle={toggle} />
        <div className="w-4 shrink-0"
          style={{ background: 'linear-gradient(to right, #b8ad98, #f0e8d8, #e0d4bc, #f0e8d8, #b8ad98)',
            boxShadow: 'inset -3px 0 6px rgba(0,0,0,0.12), inset 3px 0 6px rgba(0,0,0,0.12)' }} />
        <BookPage events={rightEvents} side="right" pageNum={rightPage}
          listId={listId} contactId={contactId} expandedIds={expandedIds} onToggle={toggle} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4 px-1">
        <button
          onClick={() => navigate('right')}
          disabled={spread === 0 || !!animDir}
          className="flex items-center gap-1 text-sm text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" /> Předchozí
        </button>
        <span className="text-xs text-white/50 tabular-nums">
          {spread + 1} / {totalSpreads}
        </span>
        <button
          onClick={() => navigate('left')}
          disabled={spread >= totalSpreads - 1 || !!animDir}
          className="flex items-center gap-1 text-sm text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
        >
          Další <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events', contactId] }); setShowAdd(false) },
  })

  const fullName = [contactData?.first_name, contactData?.last_name].filter(Boolean).join(' ')
  const events = eventsData ?? []

  return (
    <Layout maxWidth="2xl" bgImage="/peopleworth.jpg">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/lists/${listId}/contacts/${contactId}`}
          className="btn-ghost p-2 text-zinc-600 bg-white/80 hover:bg-white rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-900">Kniha záznamů</h1>
          {fullName && <p className="text-sm text-zinc-500">{fullName}</p>}
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Přidat zápis
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
            <Plus className="w-4 h-4" /> Přidat první zápis
          </button>
        </div>
      ) : (
        <BookSpread events={events} listId={listId!} contactId={contactId!} />
      )}
    </Layout>
  )
}
