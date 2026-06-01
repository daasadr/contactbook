import { apiClient } from './client'

export interface BusinessCard {
  name?: string
  title?: string
  company?: string
  tagline?: string
  email?: string
  phone?: string
  website?: string
  linkedin?: string
  twitter?: string
  location?: string
  color?: string
}

export interface CardData {
  card: BusinessCard
  show_card_button: boolean
  card_slug: string | null
  user_name: string
  user_email: string
}

export const cardApi = {
  getMyCard: () =>
    apiClient.get<CardData>('/card/me'),

  saveCard: (card: BusinessCard, show_card_button?: boolean) =>
    apiClient.put<{ card: BusinessCard; show_card_button: boolean; card_slug: string }>('/card/me', {
      card,
      show_card_button,
    }),

  generateWithAI: () =>
    apiClient.post<{ generated: Partial<BusinessCard> }>('/card/ai', {}),

  getPublicCard: (slug: string) =>
    apiClient.get<{ card: BusinessCard; slug: string }>(`/card/${slug}`),
}
