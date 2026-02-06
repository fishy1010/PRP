import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';
import type { Template, Subtask, Tag, Todo } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/templates/[id]/use
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const template = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, session.sub) as Template | undefined;
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    let dueDate: string | null = null;
    if (body?.due_date) {
      dueDate = body.due_date;
    } else if (template.due_date_offset_days !== null && template.due_date_offset_days !== undefined) {
      const now = getSingaporeNow();
      const target = new Date(now.getTime() + template.due_date_offset_days * 24 * 60 * 60 * 1000);
      dueDate = toSingaporeISO(target);
    }

    const nowIso = toSingaporeISO(getSingaporeNow());
    const stmt = db.prepare(`
      INSERT INTO todos (
        title,
        due_date,
        priority,
        is_recurring,
        recurrence_pattern,
        reminder_minutes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      template.title_template,
      dueDate,
      template.priority,
      template.is_recurring ? 1 : 0,
      template.recurrence_pattern,
      template.reminder_minutes,
      nowIso,
      nowIso
    );

    const todoId = result.lastInsertRowid as number;

    let subtasks: Subtask[] = [];
    if (template.subtasks_json) {
      try {
        const parsed = JSON.parse(template.subtasks_json) as string[];
        const insertSubtask = db.prepare(`
          INSERT INTO subtasks (todo_id, title, completed, position, created_at)
          VALUES (?, ?, 0, ?, ?)
        `);

        parsed.forEach((title, index) => {
          const trimmed = title.trim();
          if (!trimmed) return;
          insertSubtask.run(todoId, trimmed, index, nowIso);
        });

        subtasks = db.prepare(`
          SELECT * FROM subtasks
          WHERE todo_id = ?
          ORDER BY position ASC
        `).all(todoId) as Subtask[];
      } catch (error) {
        console.error('Error parsing subtasks_json:', error);
      }
    }

    if (Array.isArray(body?.tag_ids) && body.tag_ids.length > 0) {
      const tagIds: number[] = body.tag_ids;
      const validTags = db.prepare(`
        SELECT id FROM tags WHERE user_id = ? AND id IN (${tagIds.map(() => '?').join(',')})
      `).all(session.sub, ...tagIds) as { id: number }[];

      const uniqueIds = Array.from(new Set(validTags.map((t) => t.id)));
      const insertTag = db.prepare(
        'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)'
      );

      uniqueIds.forEach((tagId) => {
        insertTag.run(todoId, tagId);
      });
    }

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId) as Todo;
    const tags = db.prepare(`
      SELECT t.*
      FROM todo_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
      ORDER BY t.name ASC
    `).all(todoId) as Tag[];

    const normalizedSubtasks = subtasks.map((subtask) => ({
      ...subtask,
      completed: Boolean(subtask.completed),
    }));

    const total = normalizedSubtasks.length;
    const completed = normalizedSubtasks.filter((s) => s.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return NextResponse.json({
      todo: {
        ...todo,
        subtasks: normalizedSubtasks,
        subtask_progress: { completed, total, percentage },
        tags,
      },
    });
  } catch (error) {
    console.error('Error using template:', error);
    return NextResponse.json(
      { error: 'Failed to use template' },
      { status: 500 }
    );
  }
}
