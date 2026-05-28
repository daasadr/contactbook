import { useState, useEffect, useRef } from 'react'
import { Users, UserPlus, X, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { relationshipsApi, type RelationshipContact } from '@/api/relationships'

interface Props {
  contactId: string
}

export default function ContactConnections({ contactId }: Props) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pending, setPending] = useState<RelationshipContact | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: relsData } = useQuery({
    queryKey: ['relationships', contactId],
    queryFn: () => relationshipsApi.get(contactId).then(r => r.data.relationships),
    enabled: !!contactId,
  })

  const { data: searchData } = useQuery({
    queryKey: ['contact-search', debouncedSearch, contactId],
    queryFn: () => relationshipsApi.search(debouncedSearch, contactId).then(r => r.data.contacts),
    enabled: debouncedSearch.length >= 2,
  })

  const addMutation = useMutation({
    mutationFn: ({ otherId, label }: { otherId: string; label?: string }) =>
      relationshipsApi.add(contactId, otherId, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', contactId] })
      setPending(null)
      setPendingLabel('')
      setSearch('')
      setDebouncedSearch('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (otherId: string) => relationshipsApi.remove(contactId, otherId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['relationships', contactId] }),
  })

  const relationships = relsData ?? []
  const connectedIds = new Set(relationships.map(r => r.other_contact.id))
  const filteredResults = (searchData ?? []).filter(c => !connectedIds.has(c.id))

  const openSearch = () => {
    setShowSearch(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  return (
    <div className="card p-6 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Zná tyto lidi</h2>
        </div>
        <button
          onClick={openSearch}
          className="btn-ghost p-1.5 text-zinc-400 hover:text-primary-600"
          title="Přidat propojení"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Vyhledávací pole */}
      {showSearch && (
        <div className="mb-4 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-sm"
              placeholder="Hledat kontakt k propojení…"
            />
            <button
              onClick={() => { setShowSearch(false); setSearch(''); setPending(null) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {filteredResults.length > 0 && !pending && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
              {filteredResults.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setPending(c); setSearch('') }}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center gap-3 border-b last:border-0 border-zinc-100"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {[c.first_name, c.last_name].filter(Boolean).map(n => n![0].toUpperCase()).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {c.first_name} {c.last_name ?? ''}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{c.list_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Potvrzení propojení s volitelným popiskem */}
      {pending && (
        <div className="mb-4 p-3 bg-primary-50 rounded-xl border border-primary-100">
          <p className="text-xs text-zinc-500 mb-2">
            Propojit s <strong>{pending.first_name} {pending.last_name ?? ''}</strong>
          </p>
          <input
            value={pendingLabel}
            onChange={e => setPendingLabel(e.target.value)}
            className="input text-sm mb-2"
            placeholder="Popisek vztahu (nepovinné) — kolegové, kamarádi, rodina…"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') addMutation.mutate({ otherId: pending.id, label: pendingLabel || undefined })
              if (e.key === 'Escape') { setPending(null); setPendingLabel('') }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => addMutation.mutate({ otherId: pending.id, label: pendingLabel || undefined })}
              disabled={addMutation.isPending}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {addMutation.isPending ? 'Přidávání…' : 'Propojit'}
            </button>
            <button
              onClick={() => { setPending(null); setPendingLabel('') }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Zrušit
            </button>
          </div>
          {addMutation.isError && (
            <p className="text-xs text-red-500 mt-2">
              {(addMutation.error as any)?.response?.data?.error ?? 'Nepodařilo se přidat propojení'}
            </p>
          )}
        </div>
      )}

      {/* Seznam propojení */}
      {relationships.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-4">
          Zatím žádná propojení.{' '}
          {!showSearch && (
            <button onClick={openSearch} className="text-primary-600 hover:underline">
              Přidat propojení
            </button>
          )}
        </p>
      ) : (
        <div className="space-y-2">
          {relationships.map(rel => {
            const c = rel.other_contact
            const initials = [c.first_name, c.last_name].filter(Boolean).map(n => n![0].toUpperCase()).join('')
            return (
              <div key={rel.id} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0 select-none">
                  {initials}
                </div>
                <Link
                  to={`/lists/${c.list_id}/contacts/${c.id}`}
                  className="flex-1 min-w-0 hover:text-primary-700"
                >
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {c.first_name} {c.last_name ?? ''}
                    {rel.label && (
                      <span className="ml-2 text-xs text-zinc-400 font-normal">{rel.label}</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{c.list_name}</p>
                </Link>
                <button
                  onClick={() => removeMutation.mutate(c.id)}
                  disabled={removeMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-300 hover:text-red-500"
                  title="Odebrat propojení"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
