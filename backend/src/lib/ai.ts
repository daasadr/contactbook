import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'

export const AI_MODEL = 'claude-sonnet-4-6'
export const AI_MAX_TOKENS = 2048

let _client: Anthropic | null = null

export function getAIClient(): Anthropic {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY není nastaven — přidej ho do .env')
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  }
  return _client
}

export function isAIAvailable(): boolean {
  return !!config.ANTHROPIC_API_KEY
}

function todayCZ(): string {
  return new Date().toLocaleDateString('cs-CZ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function buildContactSystemPrompt(params: {
  contactName: string
  fieldData: Record<string, { label: string; value: unknown; type: string }>
  events: Array<{ title: string; content: string; event_date: string; tags: string[] }>
  listName: string
}): string {
  const { contactName, fieldData, events, listName } = params

  const fieldsSection = Object.entries(fieldData)
    .filter(([, v]) => v.value !== null && v.value !== undefined && v.value !== '')
    .map(([, v]) => `- ${v.label}: ${v.value}`)
    .join('\n') || '(žádná vyplněná pole)'

  const eventsSection = events.length === 0
    ? '(žádné záznamy)'
    : events
        .slice(0, 30)
        .map(e => {
          const date = new Date(e.event_date).toLocaleDateString('cs-CZ')
          const tags = e.tags?.length ? ` [${e.tags.join(', ')}]` : ''
          return `${date}${tags}: ${e.title}\n${e.content}`
        })
        .join('\n\n---\n\n')

  return `Jsi osobní asistent aplikace Peopleworth — nástroje pro správu mezilidských vztahů.
Pomáháš uživateli pečovat o vztahy s konkrétním člověkem z jejich života.

Dnešní datum: ${todayCZ()}

Níže jsou veškeré informace, které o tomto kontaktu uživatel zaznamenal.
Odpovídej vždy v přirozené, plynné češtině. Buď konkrétní, praktický a empatický.
Pokud nemáš dostatek informací pro kvalitní odpověď, řekni to upřímně a navrhni, co by uživatel mohl doplnit.
Nikdy nevymýšlej fakta, která nejsou v datech. Drž se toho, co víš.
Počítej věk, délku odmlky a jiné časové údaje vždy od dnešního data výše.

=== KONTAKT ===
Jméno: ${contactName}
Seznam: ${listName}

=== INFORMACE O KONTAKTU ===
${fieldsSection}

=== KNIHA ZÁZNAMŮ (záznamy ze setkání, seřazeny od nejnovějšího) ===
${eventsSection}`
}
