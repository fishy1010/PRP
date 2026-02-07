'use client';

import { useState } from 'react';
import { TodoWithSubtasks, Subtask, Priority, REMINDER_OPTIONS, Tag, RecurrencePattern } from '@/types/todo';

interface TodoItemProps {
  todo: TodoWithSubtasks;
  isOverdue: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
  availableTags: Tag[];
}

export default function TodoItem({
  todo,
  isOverdue,
  onUpdated,
  onDeleted,
  availableTags,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(
    todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : ''
  );
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const [editReminder, setEditReminder] = useState<number | null>(todo.reminder_minutes ?? null);
  const [editIsRecurring, setEditIsRecurring] = useState<boolean>(Boolean(todo.is_recurring));
  const [editRecurrencePattern, setEditRecurrencePattern] = useState<RecurrencePattern>(
    (todo.recurrence_pattern as RecurrencePattern) || 'daily'
  );
  const [editError, setEditError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskError, setSubtaskError] = useState('');
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const [editTags, setEditTags] = useState<number[]>(todo.tags.map((tag) => tag.id));

  const subtasks = todo.subtasks || [];
  const progress = todo.subtask_progress || { completed: 0, total: 0, percentage: 0 };

  const getTextColor = (hex: string) => {
    const normalized = hex.replace('#', '');
    const r = parseInt(normalized.substring(0, 2), 16);
    const g = parseInt(normalized.substring(2, 4), 16);
    const b = parseInt(normalized.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#FFFFFF';
  };

  const handleToggleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      });

      if (response.ok) {
        onUpdated();
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleted();
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    if (editIsRecurring && !editDueDate) {
      setEditError('Due date is required for recurring todos');
      return;
    }
    setEditError('');

    setLoading(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          due_date: editDueDate || null,
          priority: editPriority,
          is_recurring: editIsRecurring,
          recurrence_pattern: editIsRecurring ? editRecurrencePattern : null,
          reminder_minutes: editReminder === null ? undefined : editReminder,
        }),
      });

      if (response.ok) {
        await fetch(`/api/todos/${todo.id}/tags`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tag_ids: editTags }),
        });
        setIsEditing(false);
        onUpdated();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = async () => {
    const trimmed = subtaskTitle.trim();
    if (!trimmed) {
      setSubtaskError('Subtask title is required');
      return;
    }

    setSubtaskLoading(true);
    setSubtaskError('');

    try {
      const response = await fetch(`/api/todos/${todo.id}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add subtask');
      }

      setSubtaskTitle('');
      onUpdated();
    } catch (error) {
      setSubtaskError(error instanceof Error ? error.message : 'Failed to add subtask');
    } finally {
      setSubtaskLoading(false);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    setSubtaskLoading(true);
    try {
      await fetch(`/api/subtasks/${subtask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !subtask.completed }),
      });
      onUpdated();
    } catch (error) {
      console.error('Error updating subtask:', error);
    } finally {
      setSubtaskLoading(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    setSubtaskLoading(true);
    try {
      await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });
      onUpdated();
    } catch (error) {
      console.error('Error deleting subtask:', error);
    } finally {
      setSubtaskLoading(false);
    }
  };

  const getPriorityBadgeColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white border-red-600';
      case 'medium':
        return 'bg-yellow-500 text-white border-yellow-600';
      case 'low':
        return 'bg-green-500 text-white border-green-600';
    }
  };

  const getRelativeTime = (dueDateString: string) => {
    const dueDate = new Date(dueDateString);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const overdueMins = Math.abs(diffMins);
      const overdueHours = Math.abs(diffHours);
      const overdueDays = Math.abs(diffDays);

      if (overdueMins < 60) {
        return `${overdueMins} min${overdueMins !== 1 ? 's' : ''} overdue`;
      } else if (overdueHours < 24) {
        return `${overdueHours} hour${overdueHours !== 1 ? 's' : ''} overdue`;
      } else {
        return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
      }
    }

    if (diffMins < 60) {
      return `Due in ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const bgColor = isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200';

  if (isEditing) {
    return (
      <div className={`${bgColor} border rounded-lg p-4 shadow-sm`}>
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={loading}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as Priority)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={loading}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={editReminder === null ? 'null' : editReminder}
              onChange={(e) => {
                const val = e.target.value;
                setEditReminder(val === 'null' ? null : Number(val));
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={loading}
            >
              <option value="null">No Reminder</option>
              {REMINDER_OPTIONS.filter(o => o.value !== null).map((opt) => (
                <option key={opt.label} value={opt.value as number}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={editDueDate}
              onChange={(e) => {
                const value = e.target.value;
                setEditDueDate(value);
                if (!value) {
                  setEditIsRecurring(false);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none md:col-span-2"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editIsRecurring}
                onChange={(e) => setEditIsRecurring(e.target.checked)}
                disabled={loading || !editDueDate}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Repeat
            </label>
            <select
              value={editRecurrencePattern}
              onChange={(e) => setEditRecurrencePattern(e.target.value as RecurrencePattern)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={loading || !editDueDate || !editIsRecurring}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          {editError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {editError}
            </div>
          )}
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = editTags.includes(tag.id);
                const textColor = getTextColor(tag.color);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setEditTags((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id]
                      );
                    }}
                    className={`px-3 py-1 rounded-full border text-sm transition-colors ${
                      isSelected
                        ? 'border-transparent'
                        : 'border-gray-300 text-gray-600 bg-white'
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: tag.color, color: textColor }
                        : undefined
                    }
                  >
                    {isSelected ? '✓ ' : ''}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={loading || !editTitle.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              Update
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditTitle(todo.title);
                setEditDueDate(todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : '');
                setEditPriority(todo.priority);
                setEditIsRecurring(Boolean(todo.is_recurring));
                setEditRecurrencePattern((todo.recurrence_pattern as RecurrencePattern) || 'daily');
                setEditError('');
                setEditReminder(todo.reminder_minutes ?? null);
                setEditTags(todo.tags.map((tag) => tag.id));
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgColor} border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggleComplete}
          disabled={loading}
          className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-lg font-medium ${
                todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {todo.title}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityBadgeColor(
                todo.priority
              )}`}
            >
              {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
            </span>
            {todo.is_recurring && todo.recurrence_pattern && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full border border-gray-300 bg-gray-100 text-gray-700">
                🔄 {todo.recurrence_pattern}
              </span>
            )}
            {todo.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs font-semibold rounded-full border"
                style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
              >
                {tag.name}
              </span>
            ))}
            {todo.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs font-semibold rounded-full border"
                style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
              >
                {tag.name}
              </span>
            ))}
          </div>
          {progress.total > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500">
                {progress.completed}/{progress.total} subtasks
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-1.5 bg-blue-500 rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
          {todo.due_date && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p
                className={`text-sm ${
                  isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'
                }`}
              >
                {getRelativeTime(todo.due_date)}
              </p>
              {todo.reminder_minutes !== null && todo.reminder_minutes !== undefined && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1" title="Reminder set">
                  🔔 {REMINDER_OPTIONS.find(o => o.value === todo.reminder_minutes)?.label.replace(' before', '') || `${todo.reminder_minutes}m`}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsSubtasksOpen(!isSubtasksOpen)}
            disabled={loading}
            className="px-3 py-1 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            {isSubtasksOpen ? '▼ Subtasks' : '▶ Subtasks'}
            {progress.total > 0 ? ` (${progress.total})` : ''}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            disabled={loading}
            className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      {isSubtasksOpen && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Add a subtask..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={subtaskLoading}
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              disabled={subtaskLoading || !subtaskTitle.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {subtaskError && (
            <div className="mt-2 text-sm text-red-600">
              {subtaskError}
            </div>
          )}
          <div className="mt-3 space-y-2">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(subtask.completed)}
                  onChange={() => handleToggleSubtask(subtask)}
                  disabled={subtaskLoading}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={`flex-1 text-sm ${
                    subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {subtask.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  disabled={subtaskLoading}
                  className="text-red-600 hover:bg-red-50 rounded-md px-2 py-1"
                >
                  ✕
                </button>
              </div>
            ))}
            {subtasks.length === 0 && (
              <p className="text-sm text-gray-500">No subtasks yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
