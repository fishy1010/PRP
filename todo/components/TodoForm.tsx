
import { useState } from 'react';
import { Priority, REMINDER_OPTIONS, Tag, RecurrencePattern } from '@/types/todo';

interface TodoFormProps {
  onTodoCreated: () => void;
  tags: Tag[];
  onTemplateSaved: () => void;

export default function TodoForm({ onTodoCreated, tags, onTemplateSaved }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateError, setTemplateError] = useState('');

  const getTextColor = (hex: string) => {
    const normalized = hex.replace('#', '');
    const r = parseInt(normalized.substring(0, 2), 16);
    const g = parseInt(normalized.substring(2, 4), 16);
    const b = parseInt(normalized.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#FFFFFF';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (isRecurring && !dueDate) {
      setError('Due date is required for recurring todos');

    setLoading(true);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          due_date: dueDate || undefined,
          priority,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : undefined,
          reminder_minutes: reminderMinutes === null ? undefined : reminderMinutes,
          tag_ids: selectedTags,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create todo');
      }

      // Reset form
      setTitle('');
      setDueDate('');
      setPriority('medium');
      setIsRecurring(false);
      setRecurrencePattern('daily');
      setReminderMinutes(null);
      setSelectedTags([]);
      onTodoCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo');
    } finally {
      setLoading(false);
    }

  const handleSaveTemplate = async () => {
    setTemplateError('');
    if (!templateName.trim()) {
      setTemplateError('Template name is required');
      return;
    }

    if (!title.trim()) {
      setTemplateError('Todo title is required');
      return;
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          category: templateCategory.trim() || undefined,
          title_template: title.trim(),
          priority,
          reminder_minutes: reminderMinutes === null ? undefined : reminderMinutes,
          is_recurring: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      setIsTemplateOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('');
      onTemplateSaved();
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new todo..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={loading}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder
            </label>
            <select
              value={reminderMinutes === null ? 'null' : reminderMinutes}
              onChange={(e) => {
                const val = e.target.value;
                setReminderMinutes(val === 'null' ? null : Number(val));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={loading}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value === null ? 'null' : opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date & Time
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => {
                const value = e.target.value;
                setDueDate(value);
                if (!value) {
                  setIsRecurring(false);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={loading}
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>
        </div>

        {showAdvanced && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="repeat-toggle"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                disabled={loading || !dueDate}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="repeat-toggle" className="text-sm font-medium text-gray-700">
                Repeat
              </label>
              {!dueDate && (
                <span className="text-xs text-gray-500">Set a due date to enable</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recurrence Pattern
              </label>
              <select
                value={recurrencePattern}
                onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={loading || !dueDate || !isRecurring}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                const textColor = getTextColor(tag.color);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedTags((prev) =>
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
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 md:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
          {title.trim() && (
            <button
              type="button"
              onClick={() => setIsTemplateOpen(true)}
              className="flex-1 border border-green-300 text-green-700 font-medium py-3 px-6 rounded-lg hover:bg-green-50"
            >
              Save as Template
            </button>
          )}
        </div>
      </form>

      {isTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Save as Template</h2>
              <button
                type="button"
                onClick={() => {
                  setIsTemplateOpen(false);
                  setTemplateError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
                <input
                  type="text"
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {templateError && (
              <p className="text-sm text-red-600 mt-3">{templateError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
              >
                Save Template
              </button>
              <button
                type="button"
                onClick={() => setIsTemplateOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
