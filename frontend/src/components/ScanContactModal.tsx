import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Check, AlertTriangle, ScanLine, Camera } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/api/contacts'

// Mapování extrahovaných klíčů na interní názvy polí
const FIELD_MAP: Record<string, string> = {
  email: 'email',
  phone: 'phone',
  company: 'company',
  job_title: 'job_title',
  website: 'website',
  linkedin: 'linkedin',
  twitter: 'twitter',
  instagram: 'instagram',
  address: 'address',
  city: 'city',
  country: 'country',
  notes: 'notes',
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'Jméno',
  last_name: 'Příjmení',
  email: 'E-mail',
  phone: 'Telefon',
  company: 'Firma',
  job_title: 'Pozice',
  website: 'Web',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  address: 'Adresa',
  city: 'Město',
  country: 'Země',
  notes: 'Poznámky',
}

type FieldStatus = 'new' | 'conflict' | 'same' | 'manual'

interface FieldDecision {
  key: string
  label: string
  extracted: string
  existing?: string
  status: FieldStatus
  accepted: boolean
}

interface Props {
  // Režim "nový kontakt"
  listId?: string
  // Režim "doplnit existující"
  contactId?: string
  existingData?: Record<string, unknown>
  existingFirstName?: string
  existingLastName?: string
  availableFields?: string[]
  onClose: () => void
  onCreated?: (contactId: string) => void  // po vytvoření nového
  onUpdated?: () => void                   // po aktualizaci existujícího
}

export default function ScanContactModal({
  listId, contactId, existingData = {}, existingFirstName = '', existingLastName = '',
  onClose, onCreated, onUpdated,
}: Props) {
  const [phase, setPhase] = useState<'upload' | 'extracting' | 'review' | 'saving'>('upload')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<FieldDecision[]>([])
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const processFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setError('')
    extract(file)
  }

  const extract = async (file: File) => {
    setPhase('extracting')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await apiClient.post<{ extracted: Record<string, string> }>(
        '/extract/contact', form, { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      buildDecisions(res.data.extracted)
      setPhase('review')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Extrakce selhala. Zkus kvalitnější obrázek.'
      setError(msg)
      setPhase('upload')
    }
  }

  const buildDecisions = (extracted: Record<string, string>) => {
    const result: FieldDecision[] = []

    // Jméno a příjmení — speciální zacházení
    const nameFields: Array<{ key: string; existing: string }> = [
      { key: 'first_name', existing: existingFirstName },
      { key: 'last_name', existing: existingLastName },
    ]
    for (const { key, existing } of nameFields) {
      const val = extracted[key]
      if (!val) continue
      const status = !existing ? 'new' : existing === val ? 'same' : 'conflict'
      if (status !== 'same') {
        result.push({ key, label: FIELD_LABELS[key], extracted: val, existing: existing || undefined, status, accepted: status !== 'conflict' })
      }
    }

    // Ostatní pole
    for (const [extKey, fieldName] of Object.entries(FIELD_MAP)) {
      const val = extracted[extKey]
      if (!val) continue
      // Pokud máme seznam dostupných polí, filtrujeme na ty, co existují (nebo jsou built-in)
      // Pro "nový kontakt" zobrazíme vše
      const existing = existingData[fieldName] as string | undefined
      const status: FieldStatus = !existing ? 'new' : existing === val ? 'same' : 'conflict'
      if (status !== 'same') {
        result.push({
          key: fieldName,
          label: FIELD_LABELS[extKey] ?? extKey,
          extracted: val,
          existing: existing || undefined,
          status,
          accepted: status !== 'conflict',
        })
      }
    }

    setDecisions(result.length > 0 ? result : [])
    if (result.length === 0) {
      setError('Obrázek byl úspěšně zpracován, ale neobsahuje pole, která jsou v tomto seznamu dostupná.')
      setPhase('upload')
    }
  }

  const toggle = (key: string) =>
    setDecisions(prev => prev.map(d => d.key === key ? { ...d, accepted: !d.accepted } : d))

  const save = async () => {
    const accepted = decisions.filter(d => d.accepted)
    if (accepted.length === 0) { onClose(); return }

    setPhase('saving')
    try {
      const nameUpdates: Record<string, string> = {}
      const customUpdates: Record<string, string> = {}

      for (const d of accepted) {
        if (d.key === 'first_name') nameUpdates.first_name = d.extracted
        else if (d.key === 'last_name') nameUpdates.last_name = d.extracted
        else customUpdates[d.key] = d.extracted
      }

      if (contactId) {
        // Doplnit existující kontakt
        await contactsApi.update(
          listId ?? '',
          contactId,
          {
            ...(nameUpdates.first_name ? { first_name: nameUpdates.first_name } : {}),
            ...(nameUpdates.last_name ? { last_name: nameUpdates.last_name } : {}),
            custom_data: { ...existingData, ...customUpdates },
          } as any
        )
        queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
        onUpdated?.()
        onClose()
      } else if (listId) {
        // Nový kontakt
        const firstName = nameUpdates.first_name || (decisions.find(d => d.key === 'first_name')?.extracted ?? 'Nový kontakt')
        const res = await contactsApi.create(listId, {
          first_name: nameUpdates.first_name ?? firstName,
          last_name: nameUpdates.last_name,
          custom_data: customUpdates,
        } as any)
        queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
        onCreated?.(res.data.contact.id)
        onClose()
      }
    } catch {
      setError('Uložení se nezdařilo. Zkus to znovu.')
      setPhase('review')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) processFile(file)
  }, [])

  const newCount = decisions.filter(d => d.status === 'new' && d.accepted).length
  const conflictCount = decisions.filter(d => d.status === 'conflict').length
  const acceptedCount = decisions.filter(d => d.accepted).length

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-zinc-900">
              {contactId ? 'Doplnit z obrázku' : 'Nový kontakt ze skenu'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Upload fáze */}
          {phase === 'upload' && (
            <>
              {/* Dvě tlačítka: foťák (mobil) + soubor/galerie */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-zinc-200 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <Camera className="w-8 h-8 text-primary-500" />
                  <span className="text-sm font-medium text-zinc-700">Vyfotit</span>
                  <span className="text-xs text-zinc-400">Otevřít foťák</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-zinc-200 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <ScanLine className="w-8 h-8 text-primary-500" />
                  <span className="text-sm font-medium text-zinc-700">Ze souboru</span>
                  <span className="text-xs text-zinc-400">Galerie / soubor</span>
                </button>
              </div>

              {/* Drag & drop — jen na desktopu */}
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                className={`hidden sm:block border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                  dragging ? 'border-primary-400 bg-primary-50' : 'border-zinc-100'
                }`}
              >
                <p className="text-xs text-zinc-400">nebo přetáhni obrázek sem</p>
              </div>

              {/* Skryté inputy */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
              />
              {error && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <p className="text-xs text-zinc-400 text-center mt-3">Extrakce stojí 2 kredity · VIP uživatelé zdarma</p>
            </>
          )}

          {/* Extrakce probíhá */}
          {phase === 'extracting' && (
            <div className="py-12 text-center">
              {imageUrl && <img src={imageUrl} alt="preview" className="w-32 h-24 object-cover rounded-lg mx-auto mb-4 shadow" />}
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
              <p className="font-medium text-zinc-700">AI analyzuje obrázek…</p>
              <p className="text-sm text-zinc-400 mt-1">Hledám jméno, e-mail, telefon a další data</p>
            </div>
          )}

          {/* Review fáze */}
          {phase === 'review' && (
            <>
              {imageUrl && (
                <div className="flex gap-3 mb-4 items-start">
                  <img src={imageUrl} alt="preview" className="w-24 h-18 object-cover rounded-lg shadow shrink-0" />
                  <div className="text-sm text-zinc-500">
                    <p className="font-medium text-zinc-700 mb-1">Nalezeno {decisions.length} polí</p>
                    <p className="text-xs">✅ {newCount} nových · ⚠️ {conflictCount} konfliktů</p>
                    <p className="text-xs text-zinc-400 mt-1">Zaškrtni co chceš uložit</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {decisions.map(d => (
                  <label key={d.key} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    d.accepted ? 'bg-zinc-50' : 'bg-white opacity-60'
                  } border ${d.status === 'conflict' ? 'border-amber-200' : 'border-zinc-100'}`}>
                    <input
                      type="checkbox"
                      checked={d.accepted}
                      onChange={() => toggle(d.key)}
                      className="mt-0.5 w-4 h-4 rounded text-primary-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-zinc-500">{d.label}</span>
                        {d.status === 'new' && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full">Nové</span>
                        )}
                        {d.status === 'conflict' && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full">⚠️ Konflikt</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-800 break-words">{d.extracted}</p>
                      {d.status === 'conflict' && d.existing && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-through">{d.existing}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={save}
                  disabled={acceptedCount === 0}
                  className="btn-primary flex-1"
                >
                  <Check className="w-4 h-4" />
                  {contactId
                    ? `Doplnit ${acceptedCount} polí`
                    : `Vytvořit kontakt (${acceptedCount} polí)`
                  }
                </button>
                <button onClick={onClose} className="btn-ghost text-zinc-500">Zrušit</button>
              </div>
            </>
          )}

          {/* Ukládání */}
          {phase === 'saving' && (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto mb-3" />
              <p className="text-zinc-600">Ukládám…</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
