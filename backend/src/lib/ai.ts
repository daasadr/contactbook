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

export interface UserProfile {
  role?: string
  values?: string
  goals?: string
  communication_style?: string
  strengths?: string
  challenges?: string
  interests?: string
  about?: string
}

function buildUserProfileSection(profile: UserProfile | null): string {
  if (!profile || Object.values(profile).every(v => !v)) return ''
  const lines = [
    profile.role && `- Profese/role: ${profile.role}`,
    profile.values && `- Hodnoty: ${profile.values}`,
    profile.goals && `- Cíle: ${profile.goals}`,
    profile.communication_style && `- Styl komunikace: ${profile.communication_style}`,
    profile.strengths && `- Silné stránky: ${profile.strengths}`,
    profile.challenges && `- Aktuální výzvy: ${profile.challenges}`,
    profile.interests && `- Zájmy: ${profile.interests}`,
    profile.about && `- O uživateli: ${profile.about}`,
  ].filter(Boolean).join('\n')
  return `\n=== PROFIL UŽIVATELE (pro kontext) ===\n${lines}`
}

export function buildContactSystemPrompt(params: {
  contactName: string
  fieldData: Record<string, { label: string; value: unknown; type: string }>
  events: Array<{ title: string; content: string; event_date: string; tags: string[] }>
  listName: string
  connections?: Array<{ name: string; listName: string; label: string | null }>
  userProfile?: UserProfile | null
  isInspiration?: boolean
}): string {
  const { contactName, fieldData, events, listName, connections, userProfile, isInspiration } = params

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

  const connectionsSection = !connections || connections.length === 0
    ? '(žádná propojení)'
    : connections.map(c => {
        const label = c.label ? ` (${c.label})` : ''
        return `- ${c.name} [seznam: ${c.listName}]${label}`
      }).join('\n')

  const inspirationNote = isInspiration
    ? `\nTento kontakt je INSPIRATIVNÍ OSOBNOST — člověk, kterého uživatel osobně nezná, ale obdivuje ho. Kombinuj znalosti z tréninkových dat o této osobnosti s uživatelovými poznámkami.`
    : ''

  return `Jsi osobní asistent aplikace Peopleworth — nástroje pro správu mezilidských vztahů.
Pomáháš uživateli pečovat o vztahy a čerpat z inspirace lidí, kteří mu záleží.${inspirationNote}

Dnešní datum: ${todayCZ()}

Odpovídej vždy v přirozené, plynné češtině. Buď konkrétní, praktický a empatický.
Pokud nemáš dostatek informací, řekni to upřímně.
Nikdy nevymýšlej fakta, která nejsou v datech.
Počítej věk, délku odmlky a jiné časové údaje vždy od dnešního data výše.
${buildUserProfileSection(userProfile ?? null)}

=== KONTAKT ===
Jméno: ${contactName}
Seznam: ${listName}

=== INFORMACE O KONTAKTU ===
${fieldsSection}

=== PROPOJENÍ (lidé, které tento kontakt zná) ===
${connectionsSection}

=== KNIHA ZÁZNAMŮ (záznamy ze setkání, seřazeny od nejnovějšího) ===
${eventsSection}`
}
