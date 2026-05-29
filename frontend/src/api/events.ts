import { apiClient } from './client'

export interface EventAttachment {
  id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
}

export interface ContactEvent {
  id: string
  title?: string | null
  content: string
  event_date?: string | null
  tags?: string[] | null
  attachments: EventAttachment[]
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

  uploadAttachment: (listId: string, contactId: string, eventId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<{ event: ContactEvent }>(
      `/lists/${listId}/contacts/${contactId}/events/${eventId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  deleteAttachment: (listId: string, contactId: string, eventId: string, attachmentId: string) =>
    apiClient.delete<{ event: ContactEvent }>(
      `/lists/${listId}/contacts/${contactId}/events/${eventId}/attachments/${attachmentId}`,
    ),
}
