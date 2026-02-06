export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoRequest {
  title: string;
  due_date?: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
}

export interface UpdateTodoRequest {
  title?: string;
  due_date?: string;
  priority?: Priority;
  completed?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
}

export interface TodosResponse {
  todos: Todo[];
  overdue: Todo[];
  pending: Todo[];
  completed: Todo[];
}
