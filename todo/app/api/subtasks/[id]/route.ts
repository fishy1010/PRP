import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Subtask } from '@/types/todo';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT /api/subtasks/[id] - Update subtask
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title) {
        return NextResponse.json(
          { error: 'Subtask title cannot be empty' },
          { status: 400 }
        );
      }
      updates.push('title = ?');
      values.push(title);
    }

    if (body.completed !== undefined) {
      updates.push('completed = ?');
      values.push(body.completed ? 1 : 0);
    }

    if (updates.length === 0) {
      const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined;
      if (!existing) {
        return NextResponse.json(
          { error: 'Subtask not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        subtask: { ...existing, completed: Boolean(existing.completed) },
      });
    }

    values.push(id);
    const stmt = db.prepare(`
      UPDATE subtasks
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const info = stmt.run(...values);
    if (info.changes === 0) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask;

    return NextResponse.json({
      subtask: { ...updated, completed: Boolean(updated.completed) },
    });
  } catch (error) {
    console.error('Error updating subtask:', error);
    return NextResponse.json(
      { error: 'Failed to update subtask' },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/[id] - Delete subtask
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    return NextResponse.json(
      { error: 'Failed to delete subtask' },
      { status: 500 }
    );
  }
}
