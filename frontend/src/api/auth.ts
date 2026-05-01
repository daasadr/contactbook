import { apiClient } from './client'
import type { User } from '@/types'

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post<{ user: User; accessToken: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ user: User; accessToken: string }>('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),

  refresh: () =>
    apiClient.post<{ user: User; accessToken: string }>('/auth/refresh'),

  me: () => apiClient.get<{ user: User }>('/auth/me'),
}
