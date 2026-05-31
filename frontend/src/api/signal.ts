import { apiClient } from './client'

export interface NeglectedContact {
  id: string
  first_name: string
  last_name?: string | null
  list_id: string
  list_name: string
  list_color: string
  radar_days: number
  last_event?: string | null
  days_since?: number | null
}

export interface UpcomingBirthday {
  id: string
  first_name: string
  last_name?: string | null
  list_id: string
  list_name: string
  list_color: string
  birthday_value: string
  days_until: number
}

export interface SignalData {
  neglected: NeglectedContact[]
  birthdays: UpcomingBirthday[]
}

export const signalApi = {
  get: () =>
    apiClient.get<SignalData>('/signal'),

  analyze: () =>
    apiClient.post<{ analysis: string; credits_remaining: number | null }>('/signal/ai', {}),
}
