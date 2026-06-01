import { apiClient } from './client'
import type { User } from '@/types'

export interface UserProfile {
  role?: string
  values?: string
  goals?: string
  communication_style?: string
  strengths?: string
  challenges?: string
  interests?: string
  about?: string
}

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    apiClient.post<{ user: User; accessToken: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ user: User; accessToken: string }>('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),

  refresh: () =>
    apiClient.post<{ user: User; accessToken: string }>('/auth/refresh'),

  me: () => apiClient.get<{ user: User }>('/auth/me'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  deleteAccount: (password: string) =>
    apiClient.delete('/auth/account', { data: { password } }),

  exportData: () =>
    apiClient.get('/auth/export', { responseType: 'blob' }),

  updateName: (name: string) =>
    apiClient.patch<{ user: { id: string; name: string; email: string } }>('/auth/name', { name }),

  getProfile: () =>
    apiClient.get<{ profile: UserProfile }>('/auth/profile'),

  updateProfile: (profile: UserProfile) =>
    apiClient.patch<{ profile: UserProfile }>('/auth/profile', profile),
}
