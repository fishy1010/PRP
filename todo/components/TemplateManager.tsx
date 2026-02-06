'use client';

import { useState } from 'react';
import type { Template } from '@/types/todo';

interface TemplateManagerProps {
  templates: Template[];
  onTemplatesUpdated: () => void;
  onTemplateUsed: () => void;
}

export default function TemplateManager({
  templates,
  onTemplatesUpdated,
  onTemplateUsed,
}: TemplateManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [error, setError] = useState('');

  const startEdit = (template: Template) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditDescription(template.description || '');
    setEditCategory(template.category || '');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditCategory('');
  };

  const handleUpdate = async (id: number) => {
    setError('');
    if (!editName.trim()) {
      setError('Template name is required');
      return;
    }

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          category: editCategory.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update template');
      }

      cancelEdit();
      onTemplatesUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    setError('');

    try {
      const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }
      onTemplatesUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleUse = async (id: number) => {
    setError('');
    try {
      const response = await fetch(`/api/templates/${id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to use template');
      }

      setIsOpen(false);
      onTemplateUsed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use template');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
      >
        Templates
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Templates</h2>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  cancelEdit();
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="space-y-4 max-h-96 overflow-auto">
              {templates.length === 0 && (
                <p className="text-sm text-gray-500">No templates yet. Save one from the form.</p>
              )}
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-md p-3">
                  {editingId === template.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                      />
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdate(template.id)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-base font-semibold text-gray-900">
                            {template.name}
                          </div>
                          {template.description && (
                            <div className="text-sm text-gray-600">{template.description}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUse(template.id)}
                            className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(template)}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(template.id)}
                            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {template.category && (
                        <div className="text-xs text-gray-500">Category: {template.category}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
