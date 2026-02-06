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

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  reminder_minutes: number | null;
  subtasks_json: string | null;
  due_date_offset_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateRequest {
  name: string;
  description?: string;
  category?: string;
  title_template: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  reminder_minutes?: number;
  subtasks_json?: string;
  due_date_offset_days?: number;
}

export interface TemplateWithDetails extends Template {
  subtasks?: string[];
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface SubtaskProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface TodoWithSubtasks extends Todo {
  subtasks: Subtask[];
  subtask_progress: SubtaskProgress;
  tags: Tag[];
}

export interface CreateTodoRequest {
  title: string;
  due_date?: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  reminder_minutes?: number;
  tag_ids?: number[];
}

export interface UpdateTodoRequest {
  title?: string;
  due_date?: string;
  priority?: Priority;
  completed?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number;
  reminder_minutes?: number;
}

export const REMINDER_OPTIONS = [
  { label: 'None', value: null },
  { label: '15 mins before', value: 15 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

export interface TodosResponse {
  todos: TodoWithSubtasks[];
  overdue: TodoWithSubtasks[];
  pending: TodoWithSubtasks[];
  completed: TodoWithSubtasks[];
}
