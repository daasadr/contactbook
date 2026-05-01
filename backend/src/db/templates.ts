import type { FieldType, TemplateType } from '../types'

interface TemplateField {
  name: string
  label: string
  field_type: FieldType
  options?: { value: string; label: string }[]
  placeholder?: string
  is_required?: boolean
  sort_order: number
  section: string
}

interface Template {
  type: TemplateType
  fields: TemplateField[]
}

const networkingTemplate: Template = {
  type: 'networking',
  fields: [
    { name: 'email', label: 'E-mail', field_type: 'email', placeholder: 'jmeno@firma.cz', sort_order: 1, section: 'contact' },
    { name: 'phone', label: 'Telefon', field_type: 'phone', placeholder: '+420 000 000 000', sort_order: 2, section: 'contact' },
    { name: 'linkedin', label: 'LinkedIn', field_type: 'url', placeholder: 'linkedin.com/in/...', sort_order: 3, section: 'contact' },
    { name: 'twitter', label: 'Twitter / X', field_type: 'url', placeholder: 'x.com/...', sort_order: 4, section: 'contact' },
    { name: 'website', label: 'Web', field_type: 'url', placeholder: 'www.firma.cz', sort_order: 5, section: 'contact' },
    { name: 'company', label: 'Firma', field_type: 'text', sort_order: 10, section: 'professional' },
    { name: 'job_title', label: 'Pozice', field_type: 'text', sort_order: 11, section: 'professional' },
    { name: 'industry', label: 'Obor', field_type: 'text', sort_order: 12, section: 'professional' },
    { name: 'goals_stated', label: 'Jejich cíle (co říkají)', field_type: 'textarea', placeholder: 'Co o svých cílech říkají...', sort_order: 20, section: 'goals' },
    { name: 'goals_assumed', label: 'Jejich cíle (co si myslím)', field_type: 'textarea', placeholder: 'Moje odhad jejich skutečných cílů...', sort_order: 21, section: 'goals' },
    { name: 'interests', label: 'Zájmy a témata', field_type: 'textarea', placeholder: 'O čem rád/a mluví, co ho/ji zajímá...', sort_order: 30, section: 'personal' },
    { name: 'how_we_met', label: 'Jak jsme se poznali', field_type: 'text', sort_order: 31, section: 'personal' },
    { name: 'notes', label: 'Poznámky', field_type: 'textarea', sort_order: 99, section: 'notes' },
  ],
}

const businessTemplate: Template = {
  type: 'business',
  fields: [
    { name: 'email', label: 'E-mail', field_type: 'email', sort_order: 1, section: 'contact' },
    { name: 'phone', label: 'Telefon', field_type: 'phone', sort_order: 2, section: 'contact' },
    { name: 'website', label: 'Web firmy', field_type: 'url', sort_order: 3, section: 'contact' },
    { name: 'company', label: 'Firma', field_type: 'text', sort_order: 10, section: 'professional' },
    { name: 'job_title', label: 'Pozice', field_type: 'text', sort_order: 11, section: 'professional' },
    {
      name: 'relationship_role',
      label: 'Role ve vztahu',
      field_type: 'select',
      options: [
        { value: 'client', label: 'Klient' },
        { value: 'prospect', label: 'Prospekt' },
        { value: 'partner', label: 'Partner' },
        { value: 'supplier', label: 'Dodavatel' },
        { value: 'investor', label: 'Investor' },
        { value: 'other', label: 'Jiné' },
      ],
      sort_order: 12,
      section: 'professional',
    },
    {
      name: 'status',
      label: 'Status',
      field_type: 'select',
      options: [
        { value: 'lead', label: 'Lead' },
        { value: 'active', label: 'Aktivní' },
        { value: 'inactive', label: 'Neaktivní' },
        { value: 'closed', label: 'Uzavřeno' },
      ],
      sort_order: 13,
      section: 'professional',
    },
    { name: 'budget', label: 'Budget / hodnota', field_type: 'text', sort_order: 14, section: 'professional' },
    { name: 'notes', label: 'Poznámky', field_type: 'textarea', sort_order: 99, section: 'notes' },
  ],
}

const personalTemplate: Template = {
  type: 'personal',
  fields: [
    { name: 'email', label: 'E-mail', field_type: 'email', sort_order: 1, section: 'contact' },
    { name: 'phone', label: 'Telefon', field_type: 'phone', sort_order: 2, section: 'contact' },
    { name: 'birthday', label: 'Narozeniny', field_type: 'date', sort_order: 3, section: 'contact' },
    { name: 'name_day', label: 'Svátek (datum)', field_type: 'date', sort_order: 4, section: 'contact' },
    { name: 'hometown', label: 'Odkud pochází', field_type: 'text', sort_order: 10, section: 'personal' },
    { name: 'family_background', label: 'Rodina a zázemí', field_type: 'textarea', placeholder: 'Rodinná situace, sourozenci, odkud je rodina...', sort_order: 11, section: 'personal' },
    { name: 'occupation', label: 'Čím se živí', field_type: 'text', sort_order: 12, section: 'personal' },
    { name: 'likes', label: 'Co má rád/a', field_type: 'textarea', placeholder: 'Koníčky, záliby, oblíbená témata...', sort_order: 13, section: 'personal' },
    { name: 'dislikes', label: 'Co nemá rád/a', field_type: 'textarea', placeholder: 'Co ho/ji otravuje, co nesnáší...', sort_order: 14, section: 'personal' },
    { name: 'notes', label: 'Poznámky', field_type: 'textarea', sort_order: 99, section: 'notes' },
  ],
}

const generalTemplate: Template = {
  type: 'general',
  fields: [
    { name: 'email', label: 'E-mail', field_type: 'email', sort_order: 1, section: 'contact' },
    { name: 'phone', label: 'Telefon', field_type: 'phone', sort_order: 2, section: 'contact' },
    { name: 'birthday', label: 'Narozeniny', field_type: 'date', sort_order: 3, section: 'contact' },
    { name: 'occupation', label: 'Povolání', field_type: 'text', sort_order: 10, section: 'personal' },
    { name: 'notes', label: 'Poznámky', field_type: 'textarea', sort_order: 99, section: 'notes' },
  ],
}

export const templates: Record<TemplateType, Template> = {
  networking: networkingTemplate,
  business: businessTemplate,
  personal: personalTemplate,
  general: generalTemplate,
  custom: { type: 'custom', fields: [] },
}

export const templateMeta = {
  networking: { label: 'Networking', icon: 'network', color: '#6366f1', description: 'Pro networkery a budování vztahů' },
  business:   { label: 'Byznys', icon: 'briefcase', color: '#0ea5e9', description: 'Klienti, prospekti a obchodní kontakty' },
  personal:   { label: 'Přátelé & Rodina', icon: 'heart', color: '#ec4899', description: 'Blízcí lidé a osobní vztahy' },
  general:    { label: 'Obecné', icon: 'users', color: '#10b981', description: 'Univerzální seznam kontaktů' },
  custom:     { label: 'Vlastní', icon: 'settings', color: '#f59e0b', description: 'Začni s prázdnou šablonou' },
}
