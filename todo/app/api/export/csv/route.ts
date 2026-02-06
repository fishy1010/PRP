import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

const csvEscape = (value: string) => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

// GET /api/export/csv
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todos = db.prepare('SELECT * FROM todos').all() as any[];
    const tags = db.prepare(`
      SELECT tt.todo_id, t.name
      FROM todo_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE t.user_id = ?
      ORDER BY t.name ASC
    `).all(session.sub) as { todo_id: number; name: string }[];

    const tagsByTodo = tags.reduce<Record<number, string[]>>((acc, row) => {
      if (!acc[row.todo_id]) acc[row.todo_id] = [];
      acc[row.todo_id].push(row.name);
      return acc;
    }, {});

    const headers = [
      'id',
      'title',
      'completed',
      'due_date',
      'priority',
      'is_recurring',
      'recurrence_pattern',
      'reminder_minutes',
      'tags',
      'created_at',
      'updated_at',
    ];

    const rows = todos.map((todo) => {
      const tagNames = tagsByTodo[todo.id] || [];
      return [
        String(todo.id),
        csvEscape(todo.title || ''),
        String(todo.completed),
        todo.due_date || '',
        todo.priority || '',
        String(todo.is_recurring || 0),
        todo.recurrence_pattern || '',
        todo.reminder_minutes ?? '',
        csvEscape(tagNames.join(', ')),
        todo.created_at || '',
        todo.updated_at || '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}
