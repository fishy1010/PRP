import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/export/json
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todos = db.prepare('SELECT * FROM todos').all();
    const tags = db.prepare('SELECT * FROM tags WHERE user_id = ?').all(session.sub);
    const todoTags = db.prepare('SELECT * FROM todo_tags').all();
    const subtasks = db.prepare('SELECT * FROM subtasks').all();

    const exportData = {
      version: '1.0',
      export_date: toSingaporeISO(getSingaporeNow()),
      user_id: session.sub,
      todos,
      tags,
      todo_tags: todoTags,
      subtasks,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    return NextResponse.json(
      { error: 'Failed to export JSON' },
      { status: 500 }
    );
  }
}
