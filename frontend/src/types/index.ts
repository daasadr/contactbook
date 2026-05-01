export type FieldType =
  | 'text' | 'textarea' | 'email' | 'phone' | 'url'
  | 'date' | 'number' | 'select' | 'multiselect' | 'checkbox'

export type TemplateType = 'networking' | 'business' | 'personal' | 'general' | 'custom'

export interface SelectOption {
  value: string
  label: string
}

export interface FieldDefinition {
  id: string
  list_id: string
  name: string
  label: string
  field_type: FieldType
  options: SelectOption[] | null
  placeholder: string | null
  is_required: boolean
  is_built_in: boolean
  sort_order: number
  section: string
  created_at: string
}

export interface ContactList {
  id: string
  user_id: string
  name: string
  description: string | null
  template_type: TemplateType
  icon: string
  color: string
  created_at: string
  updated_at: string
  contact_count: number
}

export interface Contact {
  id: string
  list_id: string
  first_name: string
  last_name: string | null
  avatar_url: string | null
  custom_data: Record<string, unknown>
  is_starred: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  created_at: string
  last_login: string | null
}

export interface TemplateMeta {
  type: TemplateType
  label: string
  icon: string
  color: string
  description: string
}
