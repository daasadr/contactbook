import { apiClient } from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface SavedChat {
  id: string
  title: string
  created_at: string
  message_count?: number
  messages?: ChatMessage[]
  contact_id?: string
}

export const aiApi = {
  status: () =>
    apiClient.get<{ available: boolean }>('/ai/status'),

  chat: (contactId: string, messages: ChatMessage[]) =>
    apiClient.post<{ reply: string }>(`/ai/contacts/${contactId}/chat`, { messages }),

  saveChat: (contactId: string, title: string, messages: ChatMessage[]) =>
    apiClient.post<{ chat: SavedChat }>(`/ai/contacts/${contactId}/chats`, { title, messages }),

  getSavedChats: (contactId: string) =>
    apiClient.get<{ chats: SavedChat[] }>(`/ai/contacts/${contactId}/chats`),

  getSavedChat: (chatId: string) =>
    apiClient.get<{ chat: SavedChat }>(`/ai/chats/${chatId}`),

  deleteSavedChat: (chatId: string) =>
    apiClient.delete(`/ai/chats/${chatId}`),
}
