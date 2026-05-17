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

      {/* Vnější rám — temně vínová, kovově zlaté lesky */}
      <div style={{
        background: `
          radial-gradient(ellipse at 8% 12%, rgba(184,134,11,0.45) 0%, transparent 28%),
          radial-gradient(ellipse at 92% 88%, rgba(184,134,11,0.45) 0%, transparent 28%),
          radial-gradient(ellipse at 92% 12%, rgba(184,134,11,0.32) 0%, transparent 24%),
          radial-gradient(ellipse at 8% 88%, rgba(184,134,11,0.32) 0%, transparent 24%),
          radial-gradient(ellipse at 50% 3%, rgba(120,85,6,0.28) 0%, transparent 30%),
          radial-gradient(ellipse at 50% 97%, rgba(120,85,6,0.28) 0%, transparent 30%),
          linear-gradient(150deg, #050101 0%, #180306 18%, #0A0202 36%, #180306 52%, #0A0202 68%, #180306 84%, #050101 100%)
        `,
        padding: '140px 160px'
      }}>
        {/* Vnitřní okno — bez stínu, plynulé přechody do rámu */}
        <div className="relative overflow-hidden">
        {/* Animovaná kniha v plných barvách */}
        <img
          src="/contactbook_animated.gif"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ opacity: 0.88 }}
        />
        {/* Jemný fialový tón */}
        <div className="absolute inset-0" style={{ background: 'rgba(45, 8, 18, 0.12)' }} />
        {/* Měkké přechody na okrajích GIFu — blur + vícestupňový gradient */}
        <div className="absolute inset-0 z-20 pointer-events-none" style={{ overflow: 'hidden' }}>
          <div className="absolute top-0 left-0 right-0" style={{ height: '180px', background: 'linear-gradient(to bottom, rgba(8,1,2,1) 0%, rgba(8,1,2,0.85) 20%, rgba(8,1,2,0.5) 50%, rgba(8,1,2,0.15) 75%, transparent 100%)', filter: 'blur(6px)' }} />
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '180px', background: 'linear-gradient(to top, rgba(8,1,2,1) 0%, rgba(8,1,2,0.85) 20%, rgba(8,1,2,0.5) 50%, rgba(8,1,2,0.15) 75%, transparent 100%)', filter: 'blur(6px)' }} />
          <div className="absolute top-0 left-0 bottom-0" style={{ width: '120px', background: 'linear-gradient(to right, rgba(8,1,2,1) 0%, rgba(8,1,2,0.85) 20%, rgba(8,1,2,0.5) 50%, rgba(8,1,2,0.15) 75%, transparent 100%)', filter: 'blur(6px)' }} />
          <div className="absolute top-0 right-0 bottom-0" style={{ width: '120px', background: 'linear-gradient(to left, rgba(8,1,2,1) 0%, rgba(8,1,2,0.85) 20%, rgba(8,1,2,0.5) 50%, rgba(8,1,2,0.15) 75%, transparent 100%)', filter: 'blur(6px)' }} />
        </div>

        {/* Hero */}
        <section className="relative z-10 text-white min-h-[480px] flex items-center">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <p className="text-white text-lg sm:text-xl italic mb-5 max-w-2xl mx-auto" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)' }}>
              Vztahy jsou jediné bohatství, které roste tím, že ho dáváš.
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.8)' }}>
              Tvé kontakty,<br />
              <span className="text-yellow-300">tvé bohatství</span>
            </h1>
            <p className="text-lg sm:text-xl text-white max-w-xl mx-auto" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)' }}>
              Nestačí mít číslo v telefonu. Peopleworth ti pomáhá být tím,<br className="hidden sm:block" />
              kdo se ozve. Kdo pamatuje. Kdo je tam.
            </p>
          </div>
        </section>

        {/* Šablony — pokračování stejného pozadí */}
        <section className="relative z-10 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 25px rgba(0,0,0,0.8)' }}>Začni se šablonou nebo si vytvoř vlastní</h2>
              <p className="text-white/90 max-w-xl mx-auto" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.7)' }}>
                Každá šablona přichází s předpřipravenými poli — přidej nebo odeber cokoliv podle libosti.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((t) => (
                <div key={t.label} className="rounded-xl p-6 hover:scale-[1.02] transition-all" style={{ background: 'rgba(255,255,255,0.82)' }}>
                  <div className={`w-10 h-10 rounded-lg ${t.color} flex items-center justify-center mb-4`}>
                    {t.icon}
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-1">{t.label}</h3>
                  <p className="text-sm text-zinc-600">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Funkce — stále na pozadí knihy */}
        <section className="relative z-10 py-16 pb-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 25px rgba(0,0,0,0.8)' }}>Vše co potřebuješ</h2>
              <p className="text-white/90 max-w-xl mx-auto" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.7)' }}>
                Od jednoduchého ukládání kontaktů až po sofistikovaný systém sledování vztahů.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4 p-6 rounded-xl hover:scale-[1.02] transition-all" style={{ background: 'rgba(255,255,255,0.82)' }}>
                  <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-zinc-600">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        </div> {/* konec inner GIF window */}
      </div> {/* konec vnějšího rámu */}

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
