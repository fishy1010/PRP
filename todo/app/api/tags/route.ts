import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';
import type { Tag } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// GET /api/tags - Get all tags
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = db.prepare(`
      SELECT * FROM tags
      WHERE user_id = ?
      ORDER BY name ASC
    `).all(session.sub) as Tag[];

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create tag
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const color = typeof body.color === 'string' ? body.color.trim().toUpperCase() : '#3B82F6';

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

    if (!HEX_COLOR_REGEX.test(color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Use #RRGGBB' },
        { status: 400 }
      );
    }

    const existing = db.prepare(
      'SELECT id FROM tags WHERE user_id = ? AND name = ?'
    ).get(session.sub, name);

    if (existing) {
      return NextResponse.json(
        { error: 'Tag name already exists' },
        { status: 400 }
      );
    }

    const now = toSingaporeISO(getSingaporeNow());
    const stmt = db.prepare(`
      INSERT INTO tags (user_id, name, color, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(session.sub, name, color, now);
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid) as Tag;

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
