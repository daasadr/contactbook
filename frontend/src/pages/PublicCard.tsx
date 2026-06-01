import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Mail, Phone, Globe, Linkedin, Twitter, MapPin } from 'lucide-react'
import { cardApi } from '@/api/card'
import SEOHead from '@/components/SEOHead'

export default function PublicCard() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-card', slug],
    queryFn: () => cardApi.getPublicCard(slug!).then(r => r.data),
    enabled: !!slug,
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  if (isError || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-center px-4">
      <p className="text-zinc-500 mb-4">Vizitka nenalezena nebo nebyla sdílena.</p>
      <Link to="/" className="text-primary-600 hover:underline text-sm">← Zpět na Peopleworth</Link>
    </div>
  )

  const { card } = data
  const color = card.color || '#6366f1'
  const name = card.name || ''
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f4f4f5' }}>
      <SEOHead
        title={name ? `${name} — vizitka` : 'Digitální vizitka'}
        description={card.tagline || `Digitální vizitka uživatele ${name}`}
        noIndex={false}
      />

      <div className="w-full max-w-sm">
        {/* Card face */}
        <div className="rounded-3xl p-7 text-white relative overflow-hidden shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${color}ff, ${color}99)` }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 bg-white" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-10 bg-white" />

          <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center font-bold text-2xl mb-5 relative">
            {initials}
          </div>
          <h1 className="text-2xl font-bold">{name || 'Jméno'}</h1>
          {card.title && <p className="text-sm opacity-90 mt-1">{card.title}</p>}
          {card.company && <p className="text-xs opacity-75 mt-0.5">{card.company}</p>}
          {card.tagline && (
            <p className="text-sm opacity-90 mt-4 italic leading-relaxed border-t border-white/20 pt-4">
              „{card.tagline}"
            </p>
          )}
        </div>

        {/* Contacts */}
        <div className="bg-white rounded-3xl p-6 mt-3 shadow-lg space-y-4">
          {[
            { icon: <Mail className="w-4 h-4" />, val: card.email, href: `mailto:${card.email}` },
            { icon: <Phone className="w-4 h-4" />, val: card.phone, href: `tel:${card.phone}` },
            { icon: <Globe className="w-4 h-4" />, val: card.website, href: card.website },
            { icon: <Linkedin className="w-4 h-4" />, val: card.linkedin ? 'LinkedIn' : null, href: card.linkedin },
            { icon: <Twitter className="w-4 h-4" />, val: card.twitter ? 'Twitter / X' : null, href: card.twitter },
            { icon: <MapPin className="w-4 h-4" />, val: card.location, href: null },
          ].filter(r => r.val).map((row, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-zinc-700">
              <span style={{ color }}>{row.icon}</span>
              {row.href ? (
                <a href={row.href} target="_blank" rel="noopener noreferrer"
                  className="hover:underline truncate" style={{ color }}>
                  {row.val}
                </a>
              ) : <span className="truncate">{row.val}</span>}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-400 mt-4">
          Vizitka vytvořena v{' '}
          <Link to="/" className="hover:underline" style={{ color }}>Peopleworth</Link>
        </p>
      </div>
    </div>
  )
}
