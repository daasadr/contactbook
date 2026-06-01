import { Link } from 'react-router-dom'
import { ArrowLeft, Users, BookOpen, Radio, CheckSquare, Sparkles, CreditCard, ScanLine, Camera, Star, Network, Lightbulb, UserCircle } from 'lucide-react'
import SEOHead from '@/components/SEOHead'

interface FeatureProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Feature({ icon, title, children }: FeatureProps) {
  return (
    <div className="flex gap-4 py-5 border-b border-zinc-100 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 text-primary-600">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-zinc-900 mb-1">{title}</h3>
        <div className="text-sm text-zinc-600 leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-zinc-900 mb-1 pb-2 border-b-2 border-primary-100">{title}</h2>
      {children}
    </section>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <SEOHead title="Nápověda & funkce" description="Přehled všech funkcí aplikace Peopleworth — správa kontaktů, AI asistent, Signál, vizitka a další." canonical="/help" />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-primary-600">
            <ArrowLeft className="w-4 h-4" /> Zpět
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">Nápověda & funkce</h1>
            <p className="text-zinc-500">Peopleworth — správa vztahů, která skutečně funguje. Zde najdeš přehled všeho, co aplikace umí.</p>
          </div>

          <Section title="Základy — Seznamy a kontakty">
            <Feature icon={<Users className="w-5 h-5" />} title="Seznamy kontaktů">
              <p>Vytvoř si libovolný počet seznamů — networking, přátelé, rodina, byznys, nebo vlastní kategorie.</p>
              <p>Každý seznam má svou sadu polí. Vybíráš ze šablon nebo přidáváš vlastní pole (text, e-mail, telefon, datum, výběr z možností a další).</p>
              <p><strong>Tip:</strong> Hvězdičkování označí důležité kontakty, vyhledávání funguje přes všechna pole.</p>
            </Feature>
            <Feature icon={<Network className="w-5 h-5" />} title="Propojení kontaktů">
              <p>Zaznamenej kdo koho zná — vytvoř propojení mezi kontakty s volitelným popiskem vztahu (kolega, kamarád, mentor…).</p>
              <p>AI asistent zná tato propojení a může je zahrnout do svých rad.</p>
            </Feature>
          </Section>

          <Section title="Kniha záznamů — deník setkání">
            <Feature icon={<BookOpen className="w-5 h-5" />} title="Zápisky ze setkání">
              <p>U každého kontaktu si veď deník setkání — datum, název zápisku, volný text a štítky.</p>
              <p>Zápisky se zobrazují jako otevřená kniha (na desktopu dvě stránky, na mobilu jedna).</p>
              <p><strong>Tip:</strong> Čím více zápisků máš, tím relevantnější rady od AI dostaneš.</p>
            </Feature>
            <Feature icon={<Camera className="w-5 h-5" />} title="Fotky v zápisku">
              <p>Ke každému zápisku přidej fotky — přímo foťákem nebo ze souboru. Fotky se zobrazují jako miniatury a lze je prohlížet v lightboxu.</p>
            </Feature>
          </Section>

          <Section title="Signál — radar vztahů">
            <Feature icon={<Radio className="w-5 h-5" />} title="Signál">
              <p>Widget na dashboardu automaticky zobrazí kontakty, se kterými jsi se dlouho neozval/a, a blížící se narozeniny (do 30 dní).</p>
              <p>U každého kontaktu klikni na 📌 a ihned přidej úkol "zavolat / napsat".</p>
              <p><strong>Nastavení prahu:</strong> V nastavení každého seznamu nastav slider — kolik dní bez zápisku = upozornění (14 dní pro rodinu, 90 dní pro staré přátele…).</p>
            </Feature>
            <Feature icon={<Sparkles className="w-5 h-5" />} title="AI analýza priority">
              <p>Tlačítko "Kdo je priorita tento týden?" pošle přehled tvých kontaktů Claude. Dostaneš konkrétní doporučení kdo potřebuje pozornost a proč.</p>
              <p>Stojí 1 kredit.</p>
            </Feature>
          </Section>

          <Section title="Úkoly">
            <Feature icon={<CheckSquare className="w-5 h-5" />} title="Úkoly a připomínky">
              <p>Přidávej úkoly ke konkrétním kontaktům — s termínem (datum a čas), označením splnění.</p>
              <p>Úkoly vidíš na dashboardu (přehled všech) i v detailu každého kontaktu.</p>
            </Feature>
          </Section>

          <Section title="AI asistent">
            <Feature icon={<Sparkles className="w-5 h-5" />} title="AI chat s kontaktem">
              <p>V detailu každého kontaktu máš AI asistenta, který zná vše co jsi o kontaktu zaznamenal/a — pole, zápisky ze setkání, propojení i tvůj vlastní profil.</p>
              <p>Zkus: "Téma pro příští hovor?", "Tip na dárek k narozeninám?", "Co o tomto člověku vím?"</p>
              <p>Zajímavé konverzace si ulož tlačítkem 🔖 — najdeš je v "Uložené chaty".</p>
            </Feature>
            <Feature icon={<Lightbulb className="w-5 h-5" />} title="Inspirativní osobnosti">
              <p>Speciální typ seznamu pro lidi, kteří tě inspirují (i ty, které jsi nikdy nepotkal/a).</p>
              <p>Funkce "Co by X udělal/a?" odpoví z perspektivy dané osobnosti — kombinuje znalosti Claude s tvými poznámkami.</p>
              <p>Výsledky si ulož pro pozdější čtení.</p>
            </Feature>
            <Feature icon={<UserCircle className="w-5 h-5" />} title="Tvůj profil pro AI">
              <p>V Nastavení účtu vyplň svůj profil — role, hodnoty, cíle, komunikační styl, zájmy.</p>
              <p>AI bude zohledňovat kdo jsi a rady budou výrazně osobnější.</p>
            </Feature>
          </Section>

          <Section title="Skenování vizitky">
            <Feature icon={<ScanLine className="w-5 h-5" />} title="Extrakce z obrázku">
              <p>Vyfot vizitku nebo nahraj screenshot LinkedIn profilu — AI extrahuje kontaktní údaje automaticky.</p>
              <p>Zkontroluj co chceš uložit, vyřeš případné konflikty (existující vs. nová hodnota) a potvrď. Chybějící pole se vytvoří sama.</p>
              <p>Stojí 2 kredity. Dostupné v seznamu (nový kontakt) i v detailu existujícího kontaktu (doplnit).</p>
            </Feature>
            <Feature icon={<Camera className="w-5 h-5" />} title="Fotky kontaktu">
              <p>Ke každému kontaktu přidej libovolné fotky — vizitky, obálky knih, dokumenty. Přímo foťákem nebo ze souboru.</p>
            </Feature>
          </Section>

          <Section title="Digitální vizitka">
            <Feature icon={<CreditCard className="w-5 h-5" />} title="Vizitka & plovoucí tlačítko">
              <p>Vytvoř si vlastní digitální vizitku v Nastavení účtu — jméno, pozice, kontakty, barva, tagline.</p>
              <p>Tlačítko "Vygenerovat AI" vytvoří tagline a titul z tvého profilu.</p>
              <p>Zapni plovoucí tlačítko — vždy dostupné jedním dotykem pro rychlé sdílení.</p>
              <p>Sdílej přes URL <code>peopleworth.eu/card/tvuj-slug</code> — funguje bez přihlášení.</p>
            </Feature>
          </Section>

          <Section title="Kredity a platby">
            <Feature icon={<Star className="w-5 h-5" />} title="Jak fungují kredity">
              <p>AI funkce spotřebovávají kredity: chat = 1 kr., analýza Signálu = 1 kr., extrakce z obrázku = 2 kr.</p>
              <p>Nový účet dostane 25 startovacích kreditů zdarma.</p>
              <p>Dobíjení v Nastavení účtu — balíčky 50 / 200 / 500 kreditů, nebo jednorázová podpora vývoje libovolnou částkou.</p>
            </Feature>
          </Section>

          <div className="mt-8 p-4 bg-primary-50 rounded-xl text-sm text-primary-800">
            <strong>Klíčový tip:</strong> Čím poctivěji vyplňuješ informace o kontaktech a píšeš zápisky ze setkání, tím relevantnější jsou AI doporučení. Garbage in, garbage out — ale s dobrými daty je Peopleworth skutečně výkonný nástroj.
          </div>
        </div>
      </div>
    </div>
  )
}
