import { apiClient } from './client'

export interface ContactEvent {
  id: string
  title?: string | null
  content: string
  event_date?: string | null
  tags?: string[] | null
  created_at: string
  updated_at: string
}

export interface EventInput {
  title?: string
  content: string
  event_date?: string | null
  tags?: string[]
}

export const eventsApi = {
  getAll: (listId: string, contactId: string) =>
    apiClient.get<{ events: ContactEvent[] }>(`/lists/${listId}/contacts/${contactId}/events`),

  create: (listId: string, contactId: string, data: EventInput) =>
    apiClient.post<{ event: ContactEvent }>(`/lists/${listId}/contacts/${contactId}/events`, data),

  update: (listId: string, contactId: string, eventId: string, data: EventInput) =>
    apiClient.put<{ event: ContactEvent }>(`/lists/${listId}/contacts/${contactId}/events/${eventId}`, data),

  delete: (listId: string, contactId: string, eventId: string) =>
    apiClient.delete(`/lists/${listId}/contacts/${contactId}/events/${eventId}`),
}
