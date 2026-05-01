import { apiClient } from './client'
import type { Contact, FieldDefinition } from '@/types'

export const contactsApi = {
  getAll: (listId: string, params?: { search?: string; starred?: boolean }) =>
    apiClient.get<{ contacts: Contact[] }>(`/lists/${listId}/contacts`, { params }),

  getOne: (listId: string, contactId: string) =>
    apiClient.get<{ contact: Contact }>(`/lists/${listId}/contacts/${contactId}`),

  create: (listId: string, data: { first_name: string; last_name?: string; custom_data?: Record<string, unknown> }) =>
    apiClient.post<{ contact: Contact }>(`/lists/${listId}/contacts`, data),

  update: (listId: string, contactId: string, data: Partial<Contact>) =>
    apiClient.patch<{ contact: Contact }>(`/lists/${listId}/contacts/${contactId}`, data),

  delete: (listId: string, contactId: string) =>
    apiClient.delete(`/lists/${listId}/contacts/${contactId}`),

  toggleStar: (listId: string, contactId: string) =>
    apiClient.patch<{ contact: Contact }>(`/lists/${listId}/contacts/${contactId}/star`),

  getFields: (listId: string) =>
    apiClient.get<{ fields: FieldDefinition[] }>(`/lists/${listId}/fields`),

  createField: (listId: string, data: Partial<FieldDefinition>) =>
    apiClient.post<{ field: FieldDefinition }>(`/lists/${listId}/fields`, data),

  updateField: (listId: string, fieldId: string, data: Partial<FieldDefinition>) =>
    apiClient.patch<{ field: FieldDefinition }>(`/lists/${listId}/fields/${fieldId}`, data),

  deleteField: (listId: string, fieldId: string) =>
    apiClient.delete(`/lists/${listId}/fields/${fieldId}`),

  reorderFields: (listId: string, order: { id: string; sort_order: number }[]) =>
    apiClient.put(`/lists/${listId}/fields/reorder`, order),
}
