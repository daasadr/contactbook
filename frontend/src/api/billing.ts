import { apiClient } from './client'

export interface CreditPack {
  id: string
  credits: number
  price_cents: number
  label: string
  note: string
}

export interface CreditTransaction {
  type: string
  credits: number
  amount_cents: number | null
  description: string | null
  created_at: string
}

export const billingApi = {
  getBalance: () =>
    apiClient.get<{ credits: number }>('/billing/balance'),

  getPacks: () =>
    apiClient.get<{ packs: CreditPack[]; stripe_enabled: boolean }>('/billing/packs'),

  checkoutCredits: (pack_id: string) =>
    apiClient.post<{ url: string }>('/billing/checkout/credits', { pack_id }),

  checkoutDonation: (amount_eur: number) =>
    apiClient.post<{ url: string }>('/billing/checkout/donation', { amount_eur }),

  complete: (session_id: string) =>
    apiClient.post<{ credits: number; already_processed?: boolean }>('/billing/complete', { session_id }),

  getHistory: () =>
    apiClient.get<{ transactions: CreditTransaction[] }>('/billing/history'),
}
