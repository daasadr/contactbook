import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SEOHead from '@/components/SEOHead'

const UPDATED = '30. 5. 2026'
const CONTROLLER_EMAIL = 'annlibertas@seznam.cz'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      <h2 className="text-xl font-bold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">{title}</h2>
      <div className="space-y-3 text-zinc-700 leading-relaxed">{children}</div>
    </section>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-50">
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-2 border border-zinc-200 font-semibold text-zinc-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? '' : 'bg-zinc-50/50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 border border-zinc-200 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <SEOHead
        title="Zásady ochrany osobních údajů"
        description="Informace o zpracování osobních údajů v aplikaci Peopleworth — správce, právní základ, třetí strany, vaše práva (GDPR)."
        canonical="/privacy"
      />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-primary-600">
            <ArrowLeft className="w-4 h-4" /> Zpět na hlavní stránku
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 lg:p-12">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">Zásady ochrany osobních údajů</h1>
            <p className="text-sm text-zinc-400">Aplikace Peopleworth · Platné od: {UPDATED}</p>
          </div>

          {/* TOC */}
          <nav className="mb-10 p-4 bg-zinc-50 rounded-xl text-sm">
            <p className="font-semibold text-zinc-700 mb-2">Obsah</p>
            <ol className="space-y-1 text-primary-700 list-decimal list-inside">
              {[
                ['spravce', 'Správce osobních údajů'],
                ['co-zpracovavame', 'Jaké osobní údaje zpracováváme'],
                ['pravni-zaklad', 'Právní základ zpracování'],
                ['treti-strany', 'Zpracovatelé třetích stran'],
                ['cookies', 'Cookies'],
                ['ai', 'AI asistent a Anthropic'],
                ['kontakty-tretich-osob', 'Zpracování dat třetích osob — vaše kontakty'],
                ['retence', 'Doba uchovávání dat'],
                ['prava', 'Vaše práva (GDPR)'],
                ['bezpecnost', 'Bezpečnost'],
                ['zmeny', 'Změny zásad'],
              ].map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="hover:underline">{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <Section id="spravce" title="1. Správce osobních údajů">
            <p>
              Správcem osobních údajů zpracovávaných prostřednictvím aplikace Peopleworth je fyzická osoba
              provozující tuto aplikaci (dále jen „provozovatel").
            </p>
            <p>
              <strong>Kontakt pro záležitosti ochrany osobních údajů:</strong><br />
              E-mail: <span className="font-mono text-sm bg-zinc-100 px-1 rounded">{CONTROLLER_EMAIL}</span>
            </p>
            <p className="text-zinc-500 text-sm">
              Pro uplatnění práv dle GDPR (výmaz dat, export, oprava) použijte prosím výhradně tento e-mail nebo
              funkce v nastavení účtu.
            </p>
          </Section>

          <Section id="co-zpracovavame" title="2. Jaké osobní údaje zpracováváme">
            <p className="font-medium text-zinc-900">2.1 Údaje o vašem účtu</p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li>Jméno (zobrazované jméno zadané při registraci)</li>
              <li>E-mailová adresa</li>
              <li>Hashované heslo (bcrypt, cost factor 12 — heslo v čitelné podobě neukládáme ani neznáme)</li>
              <li>Datum a čas registrace</li>
              <li>Datum a čas posledního přihlášení</li>
            </ul>

            <p className="font-medium text-zinc-900 mt-4">2.2 Technické autentizační údaje</p>
            <p className="text-sm">
              Přihlašovací token (<code>refresh_token</code>) uložený v zabezpečeném cookie prohlížeče.
              Token je platný 30 dní a při odhlášení je okamžitě invalidován a smazán.
            </p>

            <p className="font-medium text-zinc-900 mt-4">2.3 Obsah, který vytváříte</p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-2">
              <li>Seznamy kontaktů (názvy, popisy)</li>
              <li>Záznamy o kontaktech (jméno, příjmení, vlastní pole — viz sekce 7)</li>
              <li>Záznamy deníku kontaktu (datum, text, tagy)</li>
              <li>Propojení mezi kontakty</li>
              <li>Přizpůsobení vzhledu (barvy, pozadí karet)</li>
            </ul>

            <p className="font-medium text-zinc-900 mt-4">2.4 Technické logy serveru</p>
            <p className="text-sm">
              Nginx server zaznamenává IP adresu, typ prohlížeče, URL adresu a čas každého požadavku.
              Logy jsou automaticky mazány po 14 dnech dle pravidel poskytovatele hostingu (Hetzner).
            </p>
          </Section>

          <Section id="pravni-zaklad" title="3. Právní základ zpracování">
            <Table
              headers={['Účel zpracování', 'Právní základ', 'Čl. GDPR']}
              rows={[
                ['Provoz uživatelského účtu', 'Plnění smlouvy', 'čl. 6 odst. 1 písm. b)'],
                ['Přihlašovací cookie', 'Nezbytnost pro plnění smlouvy', 'čl. 6 odst. 1 písm. b)'],
                ['Obsah kontaktů a deníku', 'Plnění smlouvy / jste správce', 'čl. 6 odst. 1 písm. b)'],
                ['Logy serveru', 'Oprávněný zájem (bezpečnost)', 'čl. 6 odst. 1 písm. f)'],
                ['Odeslání e-mailu (reset hesla)', 'Plnění smlouvy / vaše žádost', 'čl. 6 odst. 1 písm. b)'],
                ['AI asistent (přenos dat na Anthropic)', 'Plnění smlouvy + informovaný souhlas použitím funkce', 'čl. 6 odst. 1 písm. a) + b)'],
                ['Platební transakce (Stripe)', 'Plnění smlouvy (nákup kreditů)', 'čl. 6 odst. 1 písm. b)'],
              ]}
            />
          </Section>

          <Section id="treti-strany" title="4. Zpracovatelé třetích stran">
            <p>Aplikace využívá tyto zpracovatele, s nimiž máme nebo spoléháme na jejich DPA (Data Processing Agreement):</p>

            <div className="space-y-4 mt-2">
              <div className="border border-zinc-200 rounded-lg p-4">
                <p className="font-semibold text-zinc-900">Hetzner Online GmbH</p>
                <p className="text-sm text-zinc-600 mt-1">
                  <strong>Sídlo:</strong> Německo (EU) ·
                  <strong> Účel:</strong> Hosting serveru a databáze ·
                  <strong> GDPR:</strong> Zpracovatel v EU, DPA k dispozici
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Veškerá data aplikace jsou uložena v datacenter Hetzner v EU. Hetzner je vázán GDPR stejně jako my.
                </p>
              </div>

              <div className="border border-zinc-200 rounded-lg p-4">
                <p className="font-semibold text-zinc-900">Resend, Inc.</p>
                <p className="text-sm text-zinc-600 mt-1">
                  <strong>Sídlo:</strong> USA ·
                  <strong> Účel:</strong> Doručování e-mailů (reset hesla) ·
                  <strong> GDPR:</strong> Standardní smluvní doložky (SCC)
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Vaše e-mailová adresa je předána Resend pouze při odeslání e-mailu pro reset hesla.
                  Data nejsou používána k jiným účelům.
                </p>
              </div>

              <div className="border border-zinc-200 rounded-lg p-4">
                <p className="font-semibold text-zinc-900">Stripe, Inc. (platební brána)</p>
                <p className="text-sm text-zinc-600 mt-1">
                  <strong>Sídlo:</strong> USA ·
                  <strong> Účel:</strong> Zpracování platebních transakcí ·
                  <strong> GDPR:</strong> Standardní smluvní doložky (SCC), DPA na stripe.com/privacy
                </p>
                <p className="text-sm text-zinc-500 mt-2">
                  Při nákupu AI kreditů nebo odeslání příspěvku jste přesměrováni na platební stránku Stripe.
                  <strong> My nikdy nevidíme, nezpracováváme ani neukládáme číslo vaší platební karty, CVV kód
                  ani expiraci.</strong> Veškerá platební data zadáváte přímo na infrastruktuře Stripe,
                  která je certifikována podle standardu <strong>PCI DSS Level 1</strong> — nejvyšší možné úrovně
                  zabezpečení platebních dat.
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  My ukládáme pouze: identifikátor Stripe session (pro ověření platby), výši transakce
                  a počet přidělených kreditů. Žádná citlivá platební data nejsou na našich serverech.
                </p>
              </div>

              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <p className="font-semibold text-zinc-900">Anthropic, Inc. (AI asistent)</p>
                <p className="text-sm text-zinc-600 mt-1">
                  <strong>Sídlo:</strong> USA ·
                  <strong> Účel:</strong> Zpracování AI dotazů ·
                  <strong> GDPR:</strong> Standardní smluvní doložky (SCC), DPA dostupné na anthropic.com
                </p>
                <p className="text-sm text-zinc-700 mt-2 font-medium">
                  Při použití funkce AI asistenta jsou data daného kontaktu odesílána Anthropic:
                </p>
                <ul className="text-sm text-zinc-600 mt-1 list-disc list-inside ml-2 space-y-1">
                  <li>Jméno a příjmení kontaktu</li>
                  <li>Všechna vyplněná pole kontaktu</li>
                  <li>Záznamy deníku (max. 40 nejnovějších)</li>
                  <li>Propojení s dalšími kontakty (jméno + popisek vztahu)</li>
                  <li>Vaše zprávy v konverzaci s AI</li>
                </ul>
                <p className="text-sm text-zinc-600 mt-2">
                  Konverzace <strong>není</strong> ukládána na našich serverech — zpracovávána je pouze per-dotaz.
                  Anthropic tato data nepoužívá k trénování modelů (dle jejich DPA).
                  Pokud si nepřejete sdílet data kontaktu s Anthropic, AI asistenta nepoužívejte.
                </p>
              </div>
            </div>
          </Section>

          <Section id="cookies" title="5. Cookies">
            <p>Aplikace používá minimální množství cookies:</p>
            <Table
              headers={['Název', 'Účel', 'Platnost', 'Typ']}
              rows={[
                ['refresh_token', 'Udržení přihlášení mezi návštěvami', '30 dní', 'Nezbytný'],
              ]}
            />
            <p className="text-sm mt-3">
              <strong>Nezbytné cookies</strong> nevyžadují váš souhlas — jsou nutné k fungování přihlášení.
              Při odhlášení je cookie okamžitě smazán.
            </p>
            <p className="text-sm mt-2">
              <strong>Nepoužíváme</strong> žádné analytické, sledovací ani marketingové cookies.
            </p>
            <p className="text-sm mt-2">
              <strong>Písma:</strong> Aplikace používá písmo Inter načítané lokálně z balíčku aplikace.
              Žádné požadavky na externí služby (jako Google Fonts) nejsou prováděny.
            </p>
          </Section>

          <Section id="ai" title="6. AI asistent a Anthropic">
            <p>
              Funkce AI asistenta je volitelnou prémiovou funkcí. Použití AI asistenta je vaším informovaným
              rozhodnutím a znamená souhlas s přenosem relevantních dat kontaktu na Anthropic, Inc. (viz sekce 4).
            </p>
            <p>
              AI asistent zpracovává data <strong>výhradně pro odpověď na váš dotaz</strong> — konverzace není
              ukládána v naší databázi a nelze ji zpětně dohledat.
            </p>
            <p className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm">
              <strong>Tip:</strong> Pokud kontakt obsahuje citlivé osobní informace třetí osoby (zdravotní stav,
              finanční situace atp.) a nechcete tato data posílat Anthropic, AI asistenta pro tento kontakt nepoužívejte.
            </p>
          </Section>

          <Section id="kontakty-tretich-osob" title="7. Zpracování dat třetích osob — vaše kontakty">
            <p>
              Aplikace Peopleworth vám umožňuje uchovávat osobní údaje o jiných lidech (jméno, kontaktní informace,
              poznámky, datum narození atd.). Tito lidé jsou <strong>třetí osoby</strong>, které nedávaly souhlas
              s uložením svých dat do naší aplikace.
            </p>

            <div className="border-l-4 border-primary-400 pl-4 space-y-2">
              <p className="font-semibold text-zinc-900">Pro osobní a soukromé použití:</p>
              <p className="text-sm">
                Pokud aplikaci používáte výhradně pro osobní správu vztahů (přátelé, rodina, osobní networking),
                uplatní se <strong>výjimka pro domácí zpracování</strong> dle čl. 2 odst. 2 písm. c) GDPR.
                Na toto zpracování se GDPR nevztahuje a nevznikají vám povinnosti jako správci dat.
              </p>
            </div>

            <div className="border-l-4 border-amber-400 pl-4 space-y-2 mt-4">
              <p className="font-semibold text-zinc-900">Pro obchodní nebo profesionální použití:</p>
              <p className="text-sm">
                Pokud ukládáte data klientů, obchodních partnerů nebo zaměstnanců v rámci podnikání, jste
                <strong> samostatným správcem osobních údajů</strong> těchto osob. Musíte mít vlastní právní základ
                pro zpracování (souhlas, smlouva, oprávněný zájem) a splnit informační povinnost vůči dotčeným osobám.
                Naše aplikace je v tomto případě vaším zpracovatelem.
              </p>
            </div>

            <p className="text-sm mt-4">
              <strong>Doporučení:</strong> Do aplikace neukládejte citlivé osobní údaje (zdravotní informace,
              politické názory, náboženské přesvědčení, sexuální orientaci atp.) bez jasného právního základu.
              Buďte opatrní při využívání AI asistenta pro kontakty s citlivými informacemi.
            </p>
          </Section>

          <Section id="retence" title="8. Doba uchovávání dat">
            <Table
              headers={['Data', 'Doba uchování']}
              rows={[
                ['Váš účet, kontakty, deník', 'Do doby smazání účtu'],
                ['Přihlašovací cookie (refresh token)', '30 dní nebo do odhlášení'],
                ['Tokeny pro reset hesla', '1 hodina (automaticky expirují)'],
                ['Logy serveru (nginx)', '14 dní (Hetzner politika)'],
                ['AI konverzace', 'Nejsou ukládány — zpracovány per-dotaz'],
              ]}
            />
            <p className="text-sm mt-3">
              Po smazání účtu jsou veškerá vaše data okamžitě a trvale odstraněna z databáze (kaskádové mazání).
              Zálohy serveru (pokud existují) jsou přepisovány do 30 dní.
            </p>
          </Section>

          <Section id="prava" title="9. Vaše práva (GDPR)">
            <p>Máte následující práva, která můžete uplatnit kdykoli:</p>
            <div className="space-y-3">
              {[
                ['Právo na přístup (čl. 15)', 'Požádat o přehled dat, která o vás zpracováváme. Dostupné přes Nastavení účtu → Export dat.'],
                ['Právo na opravu (čl. 16)', 'Opravit nepřesné nebo neúplné údaje přímo v aplikaci.'],
                ['Právo na výmaz (čl. 17)', 'Smazat svůj účet i veškerá data v Nastavení účtu → Smazat účet.'],
                ['Právo na přenositelnost (čl. 20)', 'Stáhnout veškerá svá data ve strojově čitelném formátu (JSON) přes Nastavení účtu → Export dat.'],
                ['Právo na omezení zpracování (čl. 18)', 'Kontaktujte nás e-mailem.'],
                ['Právo vznést námitku (čl. 21)', 'Pro zpracování na základě oprávněného zájmu (logy) máte právo vznést námitku.'],
              ].map(([right, desc]) => (
                <div key={right} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 shrink-0" />
                  <div>
                    <span className="font-medium text-zinc-900">{right}:</span>{' '}
                    <span className="text-sm">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-zinc-50 rounded-lg">
              <p className="font-medium text-zinc-900 text-sm mb-1">Právo podat stížnost</p>
              <p className="text-sm text-zinc-600">
                Máte právo podat stížnost u Úřadu pro ochranu osobních údajů (ÚOOÚ):<br />
                Pplk. Sochora 27, 170 00 Praha 7 · Web:{' '}
                <a href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  www.uoou.cz
                </a>
              </p>
            </div>
          </Section>

          <Section id="bezpecnost" title="10. Bezpečnost">
            <p>Pro ochranu vašich dat používáme:</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>Šifrované HTTPS spojení (TLS 1.2/1.3)</li>
              <li>Jednosměrné hashování hesel (bcrypt, cost factor 12)</li>
              <li>httpOnly, Secure, SameSite=Strict cookie pro přihlašovací token</li>
              <li>Krátkodobé přístupové JWT tokeny (platnost 15 minut)</li>
              <li>Rate limiting na přihlašovací a citlivé endpointy</li>
              <li>Bezpečnostní HTTP hlavičky (HSTS, X-Frame-Options, X-Content-Type-Options)</li>
              <li>Oddělení veřejné a interní sítě v Docker Compose</li>
            </ul>
          </Section>

          <Section id="zmeny" title="11. Změny zásad">
            <p>
              Tyto zásady můžeme aktualizovat v reakci na změny legislativy, technologií nebo funkcí aplikace.
              O podstatných změnách vás budeme informovat e-mailem nebo oznámením v aplikaci s dostatečným předstihem.
              Datum poslední aktualizace je vždy uvedeno v záhlaví tohoto dokumentu.
            </p>
            <p className="text-sm text-zinc-500">
              Pokračováním v používání aplikace po změně zásad vyjadřujete souhlas s aktualizovanou verzí.
            </p>
          </Section>

          <div className="mt-10 pt-6 border-t border-zinc-100 text-center text-sm text-zinc-400">
            <p>Peopleworth · Zásady platné od {UPDATED}</p>
            <p className="mt-1">
              Dotazy na ochranu soukromí:{' '}
              <span className="font-mono text-xs bg-zinc-100 px-1 rounded">{CONTROLLER_EMAIL}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
