import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Tag } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT /api/tags/[id] - Update tag
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, session.sub) as Tag | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return NextResponse.json(
          { error: 'Tag name is required' },
          { status: 400 }
        );
      }

      if (name.length > 50) {
        return NextResponse.json(
          { error: 'Tag name must be 50 characters or fewer' },
          { status: 400 }
        );
      }

      const nameExists = db.prepare(
        'SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?'
      ).get(session.sub, name, id);

      if (nameExists) {
        return NextResponse.json(
          { error: 'Tag name already exists' },
          { status: 400 }
        );
      }

      updates.push('name = ?');
      values.push(name);
    }

    if (body.color !== undefined) {
      const color = typeof body.color === 'string' ? body.color.trim().toUpperCase() : '';
      if (!HEX_COLOR_REGEX.test(color)) {
        return NextResponse.json(
          { error: 'Invalid color format. Use #RRGGBB' },
          { status: 400 }
        );
      }

      updates.push('color = ?');
      values.push(color);
    }

    if (updates.length === 0) {
      return NextResponse.json({ tag: existing });
    }

    values.push(id);
    db.prepare(`
      UPDATE tags
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const updated = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;

    return NextResponse.json({ tag: updated });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Delete tag
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, session.sub) as Tag | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM tags WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
