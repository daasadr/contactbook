import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import {
  BookUser, Network, Briefcase, Heart, Users,
  Star, CalendarClock, NotebookPen, Sliders, ArrowRight, Sparkles, Gift, Lock
} from 'lucide-react'

const features = [
  {
    icon: <Sliders className="w-6 h-6" />,
    title: 'Plně přizpůsobitelné',
    desc: 'Každý seznam má vlastní pole. Přidej, odeber, nebo vytvoř pole na míru svým potřebám.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Více seznamů',
    desc: 'Networker, byznysmen, člověk se zálibou v přátelstvích — jeden účet, neomezené seznamy.',
  },
  {
    icon: <NotebookPen className="w-6 h-6" />,
    title: 'Deník ke kontaktu',
    desc: 'Zaznamenej si, o čem jste mluvili, co slíbil, jak to dopadlo. Nezapomeneš nic důležitého.',
  },
  {
    icon: <CalendarClock className="w-6 h-6" />,
    title: 'Připomínky',
    desc: 'Nastav si upomínku ke kontaktu. Ozve se ti ráno i půl hodiny před — jako klasický kalendář.',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: 'Hvězdičkování',
    desc: 'Označ nejdůležitější kontakty hvězdičkou a vždy je najdeš hned na vrcholu.',
  },
  {
    icon: <BookUser className="w-6 h-6" />,
    title: 'Bezpečnost na prvním místě',
    desc: 'Tvá data jsou šifrovaná a dostupná pouze tobě. Žádné třetí strany, žádné sdílení.',
  },
]

const templates = [
  { icon: <Network className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-600', label: 'Networking', desc: 'Cíle, obor, jak jsme se poznali' },
  { icon: <Briefcase className="w-5 h-5" />, color: 'bg-sky-100 text-sky-600', label: 'Byznys', desc: 'Klienti, status, hodnota spolupráce' },
  { icon: <Heart className="w-5 h-5" />, color: 'bg-pink-100 text-pink-600', label: 'Přátelé & Rodina', desc: 'Narozeniny, záliby, zázemí, zájmy' },
  { icon: <Users className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600', label: 'Obecné', desc: 'Rychlý start pro jakékoli kontakty' },
]

export default function Landing() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b border-zinc-100 sticky top-0 bg-white/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 text-primary-600 font-bold text-lg">
            <BookUser className="w-6 h-6" />
            <span>Peopleworth</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary hidden sm:inline-flex">Přihlásit se</Link>
                <Link to="/register" className="btn-primary">Založ contactbook</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 text-white min-h-[480px] flex items-center">
        {/* Jemný vzor na pozadí */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.5'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}} />
        {/* Animovaná kniha v pozadí */}
        <img
          src="/contactbook_animated.gif"
          alt=""
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-4/5 w-auto object-contain pointer-events-none select-none"
          style={{ opacity: 0.18 }}
        />
        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <p className="text-white/70 text-lg sm:text-xl italic mb-5 max-w-2xl mx-auto">
            Vztahy jsou jediné bohatství, které roste tím, že ho dáváš.
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Tvé kontakty,<br />
            <span className="text-yellow-300">tvé bohatství</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-xl mx-auto">
            Nestačí mít číslo v telefonu. Peopleworth ti pomáhá být tím,<br className="hidden sm:block" />
            kdo se ozve. Kdo pamatuje. Kdo je tam.
          </p>
        </div>
      </section>

      {/* Šablony */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Začni se šablonou nebo si vytvoř vlastní</h2>
            <p className="text-zinc-500 max-w-xl mx-auto">
              Každá šablona přichází s předpřipravenými poli — přidej nebo odeber cokoliv podle libosti.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((t) => (
              <div key={t.label} className="card p-6 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-lg ${t.color} flex items-center justify-center mb-4`}>
                  {t.icon}
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">{t.label}</h3>
                <p className="text-sm text-zinc-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funkce */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Vše co potřebuješ</h2>
            <p className="text-zinc-500 max-w-xl mx-auto">
              Od jednoduchého ukládání kontaktů až po sofistikovaný systém sledování vztahů.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 p-6 rounded-xl hover:bg-zinc-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-zinc-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparentní model */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Transparentní model. Žádné háčky.</h2>
            <p className="text-zinc-500 max-w-xl mx-auto">
              Peopleworth není monetizační stroj. Je to nástroj, který slouží tobě — ne naopak.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-8 border border-zinc-100 text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-zinc-900 mb-2 text-lg">Aplikace zdarma</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Správa kontaktů, seznamy, deník, připomínky — bez poplatků. Bez limitu počtu kontaktů. Navždy.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-zinc-100 text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-zinc-900 mb-2 text-lg">AI funkce na kredity</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Chceš AI asistenci? Kredity odpovídají skutečným nákladům na Claude API. Nemarginujeme — jen pokrýváme provoz.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-zinc-100 text-center">
              <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-zinc-900 mb-2 text-lg">Dobrovolný příspěvek</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Líbí se ti Peopleworth? Můžeš přispět vývojáři. Ale není to podmínka. Opravdu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-zinc-100 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} Peopleworth — Tvé kontakty, tvé bohatství
      </footer>
    </div>
  )
}
