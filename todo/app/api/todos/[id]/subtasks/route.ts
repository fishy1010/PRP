import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';
import type { Subtask } from '@/types/todo';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/todos/[id]/subtasks - Create subtask
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return NextResponse.json(
        { error: 'Subtask title is required' },
        { status: 400 }
      );
    }

    const todo = db.prepare('SELECT id FROM todos WHERE id = ?').get(id);
    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    const maxPositionRow = db.prepare(
      'SELECT MAX(position) as maxPos FROM subtasks WHERE todo_id = ?'
    ).get(id) as { maxPos: number | null };

    const position = (maxPositionRow?.maxPos ?? -1) + 1;
    const createdAt = toSingaporeISO(getSingaporeNow());

    const stmt = db.prepare(`
      INSERT INTO subtasks (todo_id, title, completed, position, created_at)
      VALUES (?, ?, 0, ?, ?)
    `);

    const result = stmt.run(id, title, position, createdAt);

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid) as Subtask;

    return NextResponse.json({
      subtask: { ...subtask, completed: Boolean(subtask.completed) },
    });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to create subtask' },
      { status: 500 }
    );
  }
}
