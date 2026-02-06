import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Tag } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT /api/todos/[id]/tags - Replace tag assignments
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const tagIds = Array.isArray(body.tag_ids) ? body.tag_ids : [];

    const todo = db.prepare('SELECT id FROM todos WHERE id = ?').get(id);
    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(id);

    if (tagIds.length > 0) {
      const validTags = db.prepare(`
        SELECT id FROM tags WHERE user_id = ? AND id IN (${tagIds.map(() => '?').join(',')})
      `).all(session.sub, ...tagIds) as { id: number }[];

      const uniqueIds = Array.from(new Set(validTags.map((t) => t.id)));
      const insertTag = db.prepare(
        'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)'
      );

      uniqueIds.forEach((tagId) => {
        insertTag.run(id, tagId);
      });
    }

    const tags = db.prepare(`
      SELECT t.*
      FROM todo_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE tt.todo_id = ? AND t.user_id = ?
      ORDER BY t.name ASC
    `).all(id, session.sub) as Tag[];

    return NextResponse.json({ success: true, tags });
  } catch (error) {
    console.error('Error updating todo tags:', error);
    return NextResponse.json(
      { error: 'Failed to update todo tags' },
      { status: 500 }
    );
  }
}
