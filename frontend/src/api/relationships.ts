import { apiClient } from './client'

export interface RelationshipContact {
  id: string
  first_name: string
  last_name: string | null
  list_id: string
  list_name: string
}

export interface Relationship {
  id: string
  label: string | null
  created_at: string
  other_contact: RelationshipContact
}

export const relationshipsApi = {
  get: (contactId: string) =>
    apiClient.get<{ relationships: Relationship[] }>(`/relationships/${contactId}`),

  search: (q: string, excludeId: string) =>
    apiClient.get<{ contacts: RelationshipContact[] }>('/relationships/search', {
      params: { q, exclude: excludeId },
    }),

  add: (contactId: string, otherContactId: string, label?: string) =>
    apiClient.post<{ relationship: Relationship }>(`/relationships/${contactId}`, {
      other_contact_id: otherContactId,
      label: label || undefined,
    }),

  remove: (contactId: string, otherId: string) =>
    apiClient.delete(`/relationships/${contactId}/${otherId}`),
}
