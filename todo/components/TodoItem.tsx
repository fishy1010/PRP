'use client';

import { useState } from 'react';
import type { Todo, Priority, RecurrencePattern } from '@/types/todo';

interface TodoItemProps {
  todo: Todo;
  isOverdue: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function TodoItem({ todo, isOverdue, onUpdated, onDeleted }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(
    todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : ''
  );
  const [editPriority, setEditPriority] = useState<Priority>(todo.priority);
  const [editIsRecurring, setEditIsRecurring] = useState<boolean>(Boolean(todo.is_recurring));
  const [editRecurrencePattern, setEditRecurrencePattern] = useState<RecurrencePattern>(
    (todo.recurrence_pattern as RecurrencePattern) || 'daily'
  );
  const [editError, setEditError] = useState('');
  const [loading, setLoading] = useState(false);

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
        }),
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdated();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setLoading(false);
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
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
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
          </div>
          {todo.due_date && (
            <p
              className={`text-sm mt-1 ${
                isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'
              }`}
            >
              {getRelativeTime(todo.due_date)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
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
    </div>
  );
}
