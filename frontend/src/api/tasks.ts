import { apiClient } from './client'

export interface Task {
  id: string
  title: string
  description?: string | null
  due_date?: string | null
  is_completed: boolean
  completed_at?: string | null
  created_at: string
  contact_id: string
  // joined fields
  first_name?: string
  last_name?: string
  list_id?: string
  list_name?: string
  list_color?: string
}

export interface TaskInput {
  contact_id: string
  title: string
  description?: string
  due_date?: string | null
}

export const tasksApi = {
  getAll: (completed = false) =>
    apiClient.get<{ tasks: Task[] }>(`/tasks?completed=${completed}`),

  create: (data: TaskInput) =>
    apiClient.post<{ task: Task }>('/tasks', data),

  update: (id: string, data: Partial<Omit<TaskInput, 'contact_id'>>) =>
    apiClient.patch<{ task: Task }>(`/tasks/${id}`, data),

  toggleComplete: (id: string) =>
    apiClient.patch<{ task: Task }>(`/tasks/${id}/complete`, {}),

  delete: (id: string) =>
    apiClient.delete(`/tasks/${id}`),
}
