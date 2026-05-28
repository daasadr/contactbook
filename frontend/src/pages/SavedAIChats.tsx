import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp, Trash2, MessageSquare } from 'lucide-react'
import Layout from '@/components/Layout'
import { contactsApi } from '@/api/contacts'
import { aiApi, type ChatMessage, type SavedChat } from '@/api/ai'

function ChatItem({ chat, contactId }: { chat: SavedChat; contactId: string }) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()

  const { data: fullChat, isFetching } = useQuery({
    queryKey: ['savedChat', chat.id],
    queryFn: () => aiApi.getSavedChat(chat.id).then(r => r.data.chat),
    enabled: expanded && !chat.messages,
  })

  const deleteMutation = useMutation({
    mutationFn: () => aiApi.deleteSavedChat(chat.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedChats', contactId] }),
  })

  const messages: ChatMessage[] = chat.messages ?? fullChat?.messages ?? []
  const date = new Date(chat.created_at).toLocaleDateString('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="card bg-white border border-zinc-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-left min-w-0"
          >
            <h3 className="text-sm font-medium text-zinc-800 leading-snug mb-1">{chat.title}</h3>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>{date}</span>
              {chat.message_count != null && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {chat.message_count} zpráv
                </span>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
              title={expanded ? 'Sbalit' : 'Rozbalit'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { if (confirm('Smazat tuto konverzaci?')) deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50"
              title="Smazat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50 p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {isFetching ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-zinc-800 border border-zinc-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400 text-center py-2">Nepodařilo se načíst zprávy.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function SavedAIChats() {
  const { listId, contactId } = useParams<{ listId: string; contactId: string }>()

  const { data: contactData } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getOne(listId!, contactId!).then(r => r.data.contact),
    enabled: !!listId && !!contactId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['savedChats', contactId],
    queryFn: () => aiApi.getSavedChats(contactId!).then(r => r.data.chats),
    enabled: !!contactId,
  })

  const fullName = [contactData?.first_name, contactData?.last_name].filter(Boolean).join(' ')
  const chats = data ?? []

  return (
    <Layout maxWidth="2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/lists/${listId}/contacts/${contactId}`} className="btn-ghost p-2 text-zinc-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Uložené chaty</h1>
            {fullName && <p className="text-sm text-zinc-500">{fullName}</p>}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="w-12 h-12 text-zinc-200 mb-4" />
          <h2 className="text-lg font-semibold text-zinc-700 mb-2">Žádné uložené konverzace</h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Zajímavé rady od AI asistenta si můžeš uložit přímo z chatu na stránce kontaktu.
          </p>
          <Link
            to={`/lists/${listId}/contacts/${contactId}`}
            className="mt-6 btn-primary"
          >
            Zpět na kontakt
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map(chat => (
            <ChatItem key={chat.id} chat={chat} contactId={contactId!} />
          ))}
        </div>
      )}
    </Layout>
  )
}
