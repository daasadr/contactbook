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

      {/* Hedvábná látka — celé pozadí tohoto bloku */}
      <div className="relative" style={{
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1a0405'
      }}>
        {/* Kniha — centrovaná, fixní velikost, plynule splývá s látkou */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ paddingBottom: '8%' }}>
          <img
            src="/contactbook_animated.gif"
            alt=""
            aria-hidden="true"
            style={{
              width: 'clamp(260px, 52vw, 620px)',
              height: 'auto',
              opacity: 0.88,
              maskImage: 'radial-gradient(ellipse 88% 88% at 50% 50%, black 38%, rgba(0,0,0,0.7) 58%, rgba(0,0,0,0.2) 78%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 88% 88% at 50% 50%, black 38%, rgba(0,0,0,0.7) 58%, rgba(0,0,0,0.2) 78%, transparent 100%)',
            }}
          />
        </div>

        {/* Hero */}
        <section className="relative z-10 text-white pt-20 pb-12 sm:pt-28 sm:pb-16">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <p className="text-white text-base sm:text-lg italic mb-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.8)' }}>
              Vztahy jsou jediné bohatství, které roste tím, že ho dáváš.
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5" style={{ textShadow: '0 3px 14px rgba(0,0,0,0.98), 0 0 35px rgba(0,0,0,0.9)' }}>
              Tvé kontakty,<br />
              <span className="text-yellow-300">tvé bohatství</span>
            </h1>
            <p className="text-base sm:text-lg text-white max-w-md mx-auto" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.8)' }}>
              Nestačí mít číslo v telefonu. Peopleworth ti pomáhá být tím, kdo se ozve. Kdo pamatuje. Kdo je tam.
            </p>
          </div>
        </section>

        {/* Šablony */}
        <section className="relative z-10 pb-12">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.98), 0 0 25px rgba(0,0,0,0.9)' }}>Začni se šablonou nebo si vytvoř vlastní</h2>
              <p className="text-white/85 text-sm sm:text-base max-w-xl mx-auto" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}>
                Každá šablona přichází s předpřipravenými poli — přidej nebo odeber cokoliv podle libosti.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map((t) => (
                <div key={t.label} className="rounded-xl p-4 sm:p-6 hover:scale-[1.02] transition-all" style={{ background: 'rgba(255,255,255,0.84)' }}>
                  <div className={`w-9 h-9 rounded-lg ${t.color} flex items-center justify-center mb-3`}>{t.icon}</div>
                  <h3 className="font-semibold text-zinc-900 text-sm sm:text-base mb-1">{t.label}</h3>
                  <p className="text-xs sm:text-sm text-zinc-600">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Funkce */}
        <section className="relative z-10 pb-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.98), 0 0 25px rgba(0,0,0,0.9)' }}>Vše co potřebuješ</h2>
              <p className="text-white/85 text-sm sm:text-base max-w-xl mx-auto" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}>
                Od jednoduchého ukládání kontaktů až po sofistikovaný systém sledování vztahů.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map((f) => (
                <div key={f.title} className="flex gap-3 p-4 sm:p-5 rounded-xl hover:scale-[1.02] transition-all" style={{ background: 'rgba(255,255,255,0.84)' }}>
                  <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">{f.icon}</div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm sm:text-base mb-1">{f.title}</h3>
                    <p className="text-xs sm:text-sm text-zinc-600">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

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
