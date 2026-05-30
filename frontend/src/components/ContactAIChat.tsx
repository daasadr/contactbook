import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Loader2, BookmarkPlus, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { aiApi, type ChatMessage } from '@/api/ai'

const SUGGESTED = [
  'Téma pro příští hovor?',
  'Tip na dárek k narozeninám?',
  'Co o tomto člověku vím?',
  'Jak dlouho jsme se neviděli?',
  'Navrhni, co mu napsat',
]

interface Props {
  contactId: string
  contactName: string
}

export default function ContactAIChat({ contactId, contactName }: Props) {
  const { listId } = useParams<{ listId: string }>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const res = await aiApi.chat(contactId, next)
      setMessages([...next, { role: 'assistant', content: res.data.reply }])
    } catch (err: any) {
      const status = err.response?.status
      const msg = status === 402
        ? 'Kredity vyčerpány. Doplň je v nastavení účtu.'
        : status === 429
        ? 'Příliš mnoho dotazů. Zkus to za chvíli.'
        : status === 503
        ? 'Funkce AI asistenta není momentálně k dispozici.'
        : (err.response?.data?.error ?? 'Nepodařilo se získat odpověď. Zkus to znovu.')
      setError(msg)
      setMessages(next.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const saveChat = async () => {
    if (messages.length < 2 || saving) return
    setSaving(true)
    try {
      const firstUserMsg = messages.find(m => m.role === 'user')?.content ?? 'Konverzace'
      const title = firstUserMsg.length > 80 ? firstUserMsg.slice(0, 77) + '…' : firstUserMsg
      await aiApi.saveChat(contactId, title, messages)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Uložení se nezdařilo.')
    } finally {
      setSaving(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Sparkles className="w-4 h-4 text-primary-500" />
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide flex-1">AI asistent</h2>
        <Link
          to={`/lists/${listId}/contacts/${contactId}/saved-chats`}
          className="text-xs text-zinc-400 hover:text-primary-600 flex items-center gap-1"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          Uložené
        </Link>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
        {messages.length === 0 && !loading ? (
          <div className="text-center py-3">
            <p className="text-xs text-zinc-400 mb-3">
              Zeptej se na cokoliv o {contactName}
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-zinc-100 text-zinc-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
              <span className="text-xs text-zinc-400">AI přemýšlí…</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}

      </div>

      {/* Input */}
      <div className="shrink-0 mt-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder="Zeptej se AI… (Enter = odeslat)"
          disabled={loading}
          className="flex-1 resize-none input text-sm py-2 min-h-[38px] max-h-24"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="btn-primary p-2 shrink-0 self-end"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {messages.length > 0 && (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <button
            onClick={() => setMessages([])}
            className="text-xs text-zinc-300 hover:text-zinc-500"
          >
            Smazat konverzaci
          </button>
          <div className="flex items-center gap-2">
            {messages.length >= 2 && (
              <button
                onClick={saveChat}
                disabled={saving || saved}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 disabled:opacity-60"
              >
                {saved ? (
                  <><Check className="w-3.5 h-3.5" /> Uloženo</>
                ) : (
                  <><BookmarkPlus className="w-3.5 h-3.5" /> Uložit konverzaci</>
                )}
              </button>
            )}
            <Link
              to={`/lists/${listId}/contacts/${contactId}/saved-chats`}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Uložené chaty
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
