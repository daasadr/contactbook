import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Camera, ImageIcon, X, Trash2, Loader2, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/api/contacts'

interface Photo {
  id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
}

interface Props {
  listId: string
  contactId: string
  photos: Photo[]
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}>
      <button onClick={onClose} title="Zavřít (Esc)"
        className="fixed top-5 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 via-stone-500 to-teal-400 text-white flex items-center justify-center ring-2 ring-white/30 hover:scale-110 active:scale-95 transition-all"
        style={{ boxShadow: '0 5px 0 #3d2c1e, 0 8px 24px rgba(45,212,191,0.55)' }}>
        <X className="w-6 h-6" strokeWidth={2.5} />
      </button>
      <img src={src} alt="foto" onClick={e => e.stopPropagation()}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl" />
    </div>,
    document.body,
  )
}

export default function ContactPhotos({ listId, contactId, photos }: Props) {
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const upload = async (file: File) => {
    setUploading(true)
    try {
      await contactsApi.uploadPhoto(listId, contactId, file)
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
    } catch { /* ignore */ } finally { setUploading(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Smazat tuto fotku?')) return
    setDeletingId(id)
    try {
      await contactsApi.deletePhoto(listId, contactId, id)
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
    } catch { /* ignore */ } finally { setDeletingId(null) }
  }

  const hasPhotos = photos.length > 0

  return (
    <div className="card p-5 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" /> Fotky
        </h3>
        <div className="flex gap-2">
          <button onClick={() => cameraRef.current?.click()} disabled={uploading}
            title="Vyfotit"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-primary-600 transition-colors">
            <Camera className="w-4 h-4" />
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            title="Nahrát ze souboru"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-primary-600 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!hasPhotos && !uploading ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <p className="text-xs text-zinc-400">Žádné fotky. Přidej vizitku, obálku knihy nebo cokoliv dalšího.</p>
          <div className="flex gap-2">
            <button onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors">
              <Camera className="w-3.5 h-3.5" /> Vyfotit
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors">
              <ImageIcon className="w-3.5 h-3.5" /> Ze souboru
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative group/photo">
              <button onClick={() => setLightbox(`/uploads/${photo.filename}`)} className="focus:outline-none">
                <img src={`/uploads/${photo.filename}`} alt={photo.original_name}
                  className="w-24 h-24 object-cover rounded-lg border border-zinc-200 hover:opacity-90 transition-opacity cursor-zoom-in" />
              </button>
              <button onClick={() => remove(photo.id)} disabled={deletingId === photo.id}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-600">
                {deletingId === photo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          ))}
          {uploading && (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-200 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
        onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
