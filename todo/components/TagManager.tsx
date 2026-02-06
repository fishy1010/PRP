'use client';

import { useState } from 'react';
import type { Tag } from '@/types/todo';

interface TagManagerProps {
  tags: Tag[];
  onTagsUpdated: () => void;
}

const DEFAULT_COLOR = '#3B82F6';

export default function TagManager({ tags, onTagsUpdated }: TagManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);

  const handleCreate = async () => {
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tag name is required');
      return;
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create tag');
      }

      setName('');
      setColor(DEFAULT_COLOR);
      onTagsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor(DEFAULT_COLOR);
  };

  const handleUpdate = async (id: number) => {
    setError('');
    const trimmed = editName.trim();
    if (!trimmed) {
      setError('Tag name is required');
      return;
    }

    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, color: editColor }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tag');
      }

      cancelEdit();
      onTagsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tag?')) return;
    setError('');

    try {
      const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete tag');
      }
      onTagsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
      >
        Manage Tags
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Manage Tags</h2>
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

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tag name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value.toUpperCase())}
                  className="h-10 w-12 border border-gray-300 rounded"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Create Tag
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Your Tags</h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {tags.length === 0 && (
                  <p className="text-sm text-gray-500">No tags yet. Create one above.</p>
                )}
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2">
                    {editingId === tag.id ? (
                      <>
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value.toUpperCase())}
                          className="h-8 w-10 border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdate(tag.id)}
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
                      </>
                    ) : (
                      <>
                        <span
                          className="inline-flex h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-sm text-gray-700">{tag.name}</span>
                        <button
                          type="button"
                          onClick={() => startEdit(tag)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tag.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
