import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X, Mail, Phone, Globe, Linkedin, Twitter, MapPin,
  Share2, CreditCard,
} from 'lucide-react'
import { cardApi, type BusinessCard } from '@/api/card'
import { useAuthStore } from '@/stores/auth'

// ── Card display ───────────────────────────────────────────────────────────

function CardDisplay({ card, userEmail, slug }: {
  card: BusinessCard
  userEmail: string
  slug: string | null
}) {
  const [copied, setCopied] = useState(false)
  const color = card.color || '#6366f1'
  const name = card.name || ''
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const shareUrl = slug ? `${window.location.origin}/card/${slug}` : null

  const copy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Card face */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}ee, ${color}99)` }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
          style={{ background: 'white' }} />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'white' }} />

        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl mb-4 relative">
          {initials}
        </div>

        <h2 className="text-xl font-bold leading-tight">{name || 'Tvé jméno'}</h2>
        {card.title && <p className="text-sm opacity-90 mt-0.5">{card.title}</p>}
        {card.company && <p className="text-xs opacity-75 mt-0.5">{card.company}</p>}
        {card.tagline && (
          <p className="text-sm opacity-85 mt-3 italic leading-relaxed border-t border-white/20 pt-3">
            „{card.tagline}"
          </p>
        )}
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-2xl p-5 mt-2 space-y-3">
        {[
          { icon: <Mail className="w-4 h-4" />, val: card.email || userEmail, href: `mailto:${card.email || userEmail}` },
          { icon: <Phone className="w-4 h-4" />, val: card.phone, href: `tel:${card.phone}` },
          { icon: <Globe className="w-4 h-4" />, val: card.website, href: card.website },
          { icon: <Linkedin className="w-4 h-4" />, val: card.linkedin ? 'LinkedIn' : null, href: card.linkedin },
          { icon: <Twitter className="w-4 h-4" />, val: card.twitter ? 'Twitter / X' : null, href: card.twitter },
          { icon: <MapPin className="w-4 h-4" />, val: card.location, href: null },
        ].filter(r => r.val).map((row, i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-zinc-700">
            <span className="text-zinc-400 shrink-0">{row.icon}</span>
            {row.href ? (
              <a href={row.href} target="_blank" rel="noopener noreferrer"
                className="text-primary-600 hover:underline truncate">
                {row.val}
              </a>
            ) : (
              <span className="truncate">{row.val}</span>
            )}
          </div>
        ))}
      </div>

      {/* Share + edit */}
      <div className="flex gap-2 mt-3">
        {shareUrl && (
          <button onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-medium text-zinc-700 transition-colors">
            <Share2 className="w-4 h-4" />
            {copied ? 'Zkopírováno!' : 'Sdílet odkaz'}
          </button>
        )}
        <Link to="/settings?tab=card"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-sm font-medium text-primary-700 transition-colors">
          <CreditCard className="w-4 h-4" />
          Upravit vizitku
        </Link>
      </div>
    </div>
  )
}

// ── Floating button + modal ────────────────────────────────────────────────

export function FloatingCardButton() {
  const user = useAuthStore(s => s.user)
  const [open, setOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['my-card'],
    queryFn: () => cardApi.getMyCard().then(r => r.data),
    enabled: !!user,
    staleTime: 5 * 60_000,
  })

  // Only show if user enabled it
  if (!user || !data?.show_card_button) return null

  const card = data.card
  const color = card.color || '#6366f1'
  const name = card.name || user.name || ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'V'

  return createPortal(
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Moje vizitka"
        className="fixed bottom-6 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center font-bold text-white text-sm transition-transform hover:scale-110 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 4px 20px ${color}66` }}
      >
        {initials}
      </button>

      {/* Card modal */}
      {open && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-white/80">Moje vizitka</span>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CardDisplay card={card} userEmail={data.user_email} slug={data.card_slug} />
          </div>
        </div>,
        document.body,
      )}
    </>,
    document.body,
  )
}
