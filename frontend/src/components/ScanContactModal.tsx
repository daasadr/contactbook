import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Check, AlertTriangle, ScanLine, Camera, PlusCircle } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/api/contacts'
import type { FieldDefinition } from '@/types'

// ── Image compression ───────────────────────────────────────────────────────
async function compressImage(file: File, maxPx = 1400, quality = 0.85): Promise<File> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width: w, height: h } = img
      if (w > maxPx || h > maxPx) {
        if (w > h) { h = Math.round(h * maxPx / w); w = maxPx }
        else { w = Math.round(w * maxPx / h); h = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        resolve(new File([blob!], 'scan.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.src = url
  })
}

// ── Field matching ──────────────────────────────────────────────────────────

// Synonyma pro extrahované klíče → možné názvy/labely polí v seznamu
const SYNONYMS: Record<string, string[]> = {
  email:     ['email', 'e-mail', 'mail', 'e_mail'],
  phone:     ['phone', 'telefon', 'mobil', 'tel', 'telephone', 'mobile', 'cislo'],
  company:   ['company', 'firma', 'spolecnost', 'zamestnavatel', 'organization'],
  job_title: ['job_title', 'pozice', 'titul', 'funkce', 'title', 'role', 'job'],
  website:   ['website', 'web', 'url', 'www', 'homepage', 'web_site'],
  linkedin:  ['linkedin', 'linked_in'],
  twitter:   ['twitter', 'twit', 'x_com'],
  instagram: ['instagram', 'insta'],
  address:   ['address', 'adresa', 'ulice', 'bydliste'],
  city:      ['city', 'mesto', 'obec', 'misto'],
  country:   ['country', 'zeme', 'stat', 'narodni'],
  notes:     ['notes', 'poznamky', 'popis', 'info', 'poznamka'],
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'Jméno', last_name: 'Příjmení', email: 'E-mail', phone: 'Telefon',
  company: 'Firma', job_title: 'Pozice', website: 'Web', linkedin: 'LinkedIn',
  twitter: 'Twitter / X', instagram: 'Instagram', address: 'Adresa',
  city: 'Město', country: 'Země', notes: 'Poznámky',
}

const FIELD_TYPES: Record<string, string> = {
  email: 'email', phone: 'phone', website: 'url',
}

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s\-_.]+/g, '_')
}

function findMatchingField(extKey: string, fields: FieldDefinition[]): FieldDefinition | null {
  const syns = SYNONYMS[extKey] ?? [extKey]
  for (const f of fields) {
    if (syns.includes(f.name)) return f
    const nl = normalize(f.label)
    if (syns.some(s => nl.includes(s) || s.includes(nl))) return f
    if (normalize(f.name) === normalize(extKey)) return f
  }
  // Fallback: match by field type
  const expectedType = FIELD_TYPES[extKey]
  if (expectedType) {
    const byType = fields.find(f => f.field_type === expectedType)
    if (byType) return byType
  }
  return null
}

// ── Types ───────────────────────────────────────────────────────────────────

type FieldStatus = 'new' | 'conflict' | 'same'

interface FieldDecision {
  extKey: string        // extrahovaný klíč (email, phone...)
  fieldName: string     // jméno pole v seznamu (nebo extKey pokud neexistuje)
  label: string
  extracted: string
  existing?: string
  status: FieldStatus
  accepted: boolean
  needsCreate: boolean  // pole v seznamu neexistuje, bude vytvořeno
}

interface Props {
  listId?: string
  contactId?: string
  existingData?: Record<string, unknown>
  existingFirstName?: string
  existingLastName?: string
  onClose: () => void
  onCreated?: (contactId: string) => void
  onUpdated?: () => void
}

// ── Component ───────────────────────────────────────────────────────────────

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

  const { data: fieldsData } = useQuery({
    queryKey: ['fields', listId],
    queryFn: () => contactsApi.getFields(listId!).then(r => r.data.fields),
    enabled: !!listId,
  })
  const listFields = fieldsData ?? []

  const processFile = async (file: File) => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setError('')
    // Komprimuj před uploadem (řeší problémy s velkými fotkami z mobilu)
    const compressed = await compressImage(file)
    extract(compressed)
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
      setError(err.response?.data?.error ?? 'Extrakce selhala. Zkus ostřejší/světlejší fotografii.')
      setPhase('upload')
    }
  }

  const buildDecisions = (extracted: Record<string, string>) => {
    const result: FieldDecision[] = []

    // Jméno a příjmení
    for (const { key, existing } of [
      { key: 'first_name', existing: existingFirstName },
      { key: 'last_name', existing: existingLastName },
    ]) {
      const val = extracted[key]
      if (!val) continue
      const status: FieldStatus = !existing ? 'new' : existing === val ? 'same' : 'conflict'
      if (status !== 'same') {
        result.push({ extKey: key, fieldName: key, label: FIELD_LABELS[key], extracted: val,
          existing: existing || undefined, status, accepted: status !== 'conflict', needsCreate: false })
      }
    }

    // Ostatní extrahovaná pole
    const ALL_KEYS = Object.keys(SYNONYMS)
    for (const extKey of ALL_KEYS) {
      const val = extracted[extKey]
      if (!val) continue

      const matched = findMatchingField(extKey, listFields)
      const fieldName = matched ? matched.name : extKey
      const existing = (existingData[fieldName] ?? existingData[extKey]) as string | undefined
      const status: FieldStatus = !existing ? 'new' : existing === val ? 'same' : 'conflict'
      if (status === 'same') continue

      result.push({
        extKey, fieldName, label: matched ? matched.label : (FIELD_LABELS[extKey] ?? extKey),
        extracted: val, existing: existing || undefined,
        status, accepted: status !== 'conflict',
        needsCreate: !matched && extKey !== 'first_name' && extKey !== 'last_name',
      })
    }

    setDecisions(result.length > 0 ? result : [])
    if (result.length === 0) {
      setError('Žádná nová data k uložení — vše je již vyplněno nebo obrázek neobsahoval kontaktní informace.')
      setPhase('upload')
    }
  }

  const toggle = (key: string) =>
    setDecisions(prev => prev.map(d => d.extKey === key ? { ...d, accepted: !d.accepted } : d))

  const save = async () => {
    const accepted = decisions.filter(d => d.accepted)
    if (accepted.length === 0) { onClose(); return }
    setPhase('saving')
    try {
      const nameUpdates: Record<string, string> = {}
      const customUpdates: Record<string, string> = {}

      // Vytvoř chybějící pole
      for (const d of accepted) {
        if (d.needsCreate && listId) {
          const fieldType = FIELD_TYPES[d.extKey] ?? 'text'
          try {
            await contactsApi.createField(listId, {
              name: d.extKey, label: d.label, field_type: fieldType as any,
              section: 'contact', sort_order: 99, is_required: false, is_built_in: false,
            })
          } catch { /* field might already exist — ignore */ }
        }
      }

      for (const d of accepted) {
        if (d.extKey === 'first_name') nameUpdates.first_name = d.extracted
        else if (d.extKey === 'last_name') nameUpdates.last_name = d.extracted
        else customUpdates[d.fieldName] = d.extracted
      }

      if (contactId && listId) {
        await contactsApi.update(listId, contactId, {
          ...(nameUpdates.first_name ? { first_name: nameUpdates.first_name } : {}),
          ...(nameUpdates.last_name ? { last_name: nameUpdates.last_name } : {}),
          custom_data: { ...existingData, ...customUpdates },
        } as any)
        queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
        queryClient.invalidateQueries({ queryKey: ['fields', listId] })
        onUpdated?.(); onClose()
      } else if (listId) {
        const res = await contactsApi.create(listId, {
          first_name: nameUpdates.first_name || 'Nový kontakt',
          last_name: nameUpdates.last_name,
          custom_data: customUpdates,
        })
        queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
        queryClient.invalidateQueries({ queryKey: ['fields', listId] })
        onCreated?.(res.data.contact.id); onClose()
      }
    } catch {
      setError('Uložení se nezdařilo. Zkus to znovu.')
      setPhase('review')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) processFile(file)
  }, [listFields])

  const acceptedCount = decisions.filter(d => d.accepted).length
  const newFieldCount = decisions.filter(d => d.accepted && d.needsCreate).length

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

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
          {/* Upload */}
          {phase === 'upload' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-zinc-200 hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <Camera className="w-8 h-8 text-primary-500" />
                  <span className="text-sm font-medium text-zinc-700">Vyfotit</span>
                  <span className="text-xs text-zinc-400">Otevřít foťák</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-zinc-200 hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <ScanLine className="w-8 h-8 text-primary-500" />
                  <span className="text-sm font-medium text-zinc-700">Ze souboru</span>
                  <span className="text-xs text-zinc-400">Galerie / soubor</span>
                </button>
              </div>

              <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                className={`hidden sm:block border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragging ? 'border-primary-400 bg-primary-50' : 'border-zinc-100'}`}>
                <p className="text-xs text-zinc-400">nebo přetáhni obrázek sem</p>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />

              {error && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}
              <p className="text-xs text-zinc-400 text-center mt-3">Extrakce stojí 2 kredity · VIP uživatelé zdarma</p>
            </>
          )}

          {/* Extracting */}
          {phase === 'extracting' && (
            <div className="py-12 text-center">
              {imageUrl && <img src={imageUrl} alt="preview" className="w-32 h-24 object-cover rounded-lg mx-auto mb-4 shadow" />}
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
              <p className="font-medium text-zinc-700">AI analyzuje obrázek…</p>
              <p className="text-sm text-zinc-400 mt-1">Kompresuji a hledám kontaktní informace</p>
            </div>
          )}

          {/* Review */}
          {phase === 'review' && (
            <>
              {imageUrl && (
                <div className="flex gap-3 mb-4 items-start">
                  <img src={imageUrl} alt="preview" className="w-24 h-18 object-cover rounded-lg shadow shrink-0" />
                  <div className="text-sm text-zinc-500">
                    <p className="font-medium text-zinc-700 mb-0.5">Nalezeno {decisions.length} polí</p>
                    {newFieldCount > 0 && (
                      <p className="text-xs text-primary-600 flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5" />
                        {newFieldCount} nových polí bude vytvořeno v seznamu
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">Zaškrtni co chceš uložit</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {decisions.map(d => (
                  <label key={d.extKey}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                      d.accepted ? 'bg-zinc-50' : 'bg-white opacity-50'
                    } ${d.status === 'conflict' ? 'border-amber-200' : d.needsCreate ? 'border-primary-200' : 'border-zinc-100'}`}>
                    <input type="checkbox" checked={d.accepted} onChange={() => toggle(d.extKey)}
                      className="mt-0.5 w-4 h-4 rounded text-primary-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-medium text-zinc-500">{d.label}</span>
                        {d.status === 'new' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full">Nové</span>}
                        {d.status === 'conflict' && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full">⚠️ Přepíše stávající</span>}
                        {d.needsCreate && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 rounded-full flex items-center gap-0.5"><PlusCircle className="w-2.5 h-2.5" />Vytvoří nové pole</span>}
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
                <button onClick={save} disabled={acceptedCount === 0}
                  className="btn-primary flex-1">
                  <Check className="w-4 h-4" />
                  {contactId ? `Doplnit ${acceptedCount} polí` : `Vytvořit kontakt (${acceptedCount} polí)`}
                  {newFieldCount > 0 && <span className="text-xs opacity-80 ml-1">+{newFieldCount} nová pole</span>}
                </button>
                <button onClick={onClose} className="btn-ghost text-zinc-500">Zrušit</button>
              </div>
            </>
          )}

          {/* Saving */}
          {phase === 'saving' && (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto mb-3" />
              <p className="text-zinc-600">{newFieldCount > 0 ? 'Vytvářím pole a ukládám…' : 'Ukládám…'}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
