'use client';

import { useEffect, useState } from 'react';
import type { TodoWithSubtasks, Priority, Tag, Template } from '@/types/todo';
import TodoForm from '@/components/TodoForm';
import TodoList from '@/components/TodoList';
import PriorityFilter from '@/components/PriorityFilter';
import NotificationManager from '@/components/NotificationManager';
import TagManager from '@/components/TagManager';
import TemplateManager from '@/components/TemplateManager';

interface TodosData {
  todos: TodoWithSubtasks[];
  overdue: TodoWithSubtasks[];
  pending: TodoWithSubtasks[];
  completed: TodoWithSubtasks[];
}

interface UserInfo {
  id: number;
  username: string;
}

export default function Home() {
  const [todosData, setTodosData] = useState<TodosData>({
    todos: [],
    overdue: [],
    pending: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagFilter, setTagFilter] = useState<number | 'all'>('all');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const query = tagFilter === 'all' ? '' : `?tag_id=${tagFilter}`;
      const response = await fetch(`/api/todos${query}`);
      const data = await response.json();
      setTodosData(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return;
      const data = await response.json();
      setUser(data.user || null);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  useEffect(() => {
    fetchTodos();
    fetchTags();
    fetchTemplates();
    fetchUser();
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [tagFilter]);

  const handleTodoCreated = () => {
    fetchTodos();
  };

  const handleTodoUpdated = () => {
    fetchTodos();
  };

  const handleTodoDeleted = () => {
    fetchTodos();
  };

  const handleTagsUpdated = () => {
    fetchTags();
    fetchTodos();
  };

  const handleTemplatesUpdated = () => {
    fetchTemplates();
  };

  const handleTemplateUsed = () => {
    fetchTodos();
  };

  const handleExport = async (format: 'json' | 'csv') => {
    const response = await fetch(`/api/export/${format}`);
    if (!response.ok) {
      console.error(`Failed to export ${format}`);
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `todos-${date}.${format}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const response = await fetch('/api/import/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    });

    if (response.ok) {
      fetchTodos();
      fetchTags();
    } else {
      const data = await response.json();
      console.error(data.error || 'Failed to import JSON');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  // Filter todos by priority
  const filterTodosByPriority = (todos: TodoWithSubtasks[]) => {
    if (priorityFilter === 'all') return todos;
    return todos.filter((todo) => todo.priority === priorityFilter);
  };

  const filterTodosBySearch = (todos: TodoWithSubtasks[]) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return todos;
    return todos.filter((todo) => {
      const titleMatch = todo.title.toLowerCase().includes(query);
      const subtaskMatch = todo.subtasks.some((subtask) =>
        subtask.title.toLowerCase().includes(query)
      );
      return titleMatch || subtaskMatch;
    });
  };

  const filteredOverdue = filterTodosBySearch(filterTodosByPriority(todosData.overdue));
  const filteredPending = filterTodosBySearch(filterTodosByPriority(todosData.pending));
  const filteredCompleted = filterTodosBySearch(filterTodosByPriority(todosData.completed));

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Todo App</h1>
            <p className="text-gray-600 mt-2">Manage your tasks efficiently</p>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-gray-600">Welcome, {user.username}</span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
            <NotificationManager />
          </div>
        </header>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
          <div className="flex items-center gap-2">
            <TagManager tags={tags} onTagsUpdated={handleTagsUpdated} />
            <TemplateManager
              templates={templates}
              onTemplatesUpdated={handleTemplatesUpdated}
              onTemplateUsed={handleTemplateUsed}
            />
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="px-3 py-2 border border-green-300 rounded-md text-sm text-green-700 hover:bg-green-50"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3 py-2 border border-green-400 rounded-md text-sm text-green-800 hover:bg-green-50"
            >
              Export CSV
            </button>
            <label className="px-3 py-2 border border-blue-300 rounded-md text-sm text-blue-700 hover:bg-blue-50 cursor-pointer">
              Import JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Use Template</label>
              <select
                value=""
                onChange={async (e) => {
                  const id = e.target.value;
                  if (!id) return;
                  await fetch(`/api/templates/${id}/use`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  handleTemplateUsed();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}{template.category ? ` (${template.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <TodoForm
          onTodoCreated={handleTodoCreated}
          tags={tags}
          onTemplateSaved={handleTemplatesUpdated}
        />

        {/* Search */}
        <div className="mt-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos and subtasks..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Priority + Tag Filter */}
        <div className="mt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <PriorityFilter
              selectedPriority={priorityFilter}
              onChange={setPriorityFilter}
            />
            {tags.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Tags</label>
                <select
                  value={tagFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTagFilter(val === 'all' ? 'all' : Number(val));
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          <TodoList
            overdue={filteredOverdue}
            pending={filteredPending}
            completed={filteredCompleted}
            onTodoUpdated={handleTodoUpdated}
            onTodoDeleted={handleTodoDeleted}
            availableTags={tags}
          />
        </div>
      </div>
    </main>
  );
}
