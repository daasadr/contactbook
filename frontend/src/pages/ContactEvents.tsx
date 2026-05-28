import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, PenLine } from 'lucide-react'
import Layout from '@/components/Layout'
import { contactsApi } from '@/api/contacts'

export default function ContactEvents() {
  const { listId, contactId } = useParams<{ listId: string; contactId: string }>()

  const { data: contactData } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getOne(listId!, contactId!).then(r => r.data.contact),
    enabled: !!listId && !!contactId,
  })

  const contact = contactData
  const fullName = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ')

  return (
    <Layout maxWidth="2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/lists/${listId}/contacts/${contactId}`} className="btn-ghost p-2 text-zinc-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Kniha záznamů</h1>
          {fullName && <p className="text-sm text-zinc-500">{fullName}</p>}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <img
          src="/kniha_zaznamu_green_decent.gif"
          alt="Kniha záznamů"
          className="w-52 h-auto drop-shadow-xl mb-8 opacity-80"
        />
        <h2 className="text-2xl font-bold text-zinc-800 mb-3">Záznamy ze setkání</h2>
        <p className="text-zinc-500 max-w-sm mb-2">
          Tady budeš zapisovat zápisky ze setkání — hovory, domluvy, postřehy.
        </p>
        <p className="text-zinc-400 text-sm max-w-xs">
          Každý záznam bude mít datum, nadpis a volný text. Listovat budeš od nejnovějšího k nejstaršímu.
        </p>

        <div className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-100 text-zinc-400 text-sm font-medium">
          <PenLine className="w-4 h-4" />
          Připravujeme…
        </div>
      </div>
    </Layout>
  )
}
