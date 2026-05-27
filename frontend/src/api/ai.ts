import { apiClient } from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const aiApi = {
  status: () =>
    apiClient.get<{ available: boolean }>('/ai/status'),

  chat: (contactId: string, messages: ChatMessage[]) =>
    apiClient.post<{ reply: string }>(`/ai/contacts/${contactId}/chat`, { messages }),
}
