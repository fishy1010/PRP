import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

// POST /api/import/json
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (!data || !Array.isArray(data.todos)) {
      return NextResponse.json(
        { error: 'Invalid import format' },
        { status: 400 }
      );
    }

    const tagNameToId: Record<string, number> = {};
    const existingTags = db.prepare('SELECT * FROM tags WHERE user_id = ?').all(session.sub) as any[];

    existingTags.forEach((tag) => {
      tagNameToId[tag.name] = tag.id;
    });

    const tagIdMap: Record<number, number> = {};
    const tagInsert = db.prepare(
      'INSERT INTO tags (user_id, name, color, created_at) VALUES (?, ?, ?, ?)'
    );

    if (Array.isArray(data.tags)) {
      data.tags.forEach((tag: any) => {
        if (!tag.name) return;
        if (tagNameToId[tag.name]) {
          tagIdMap[tag.id] = tagNameToId[tag.name];
          return;
        }
        const result = tagInsert.run(session.sub, tag.name, tag.color || '#3B82F6', tag.created_at || new Date().toISOString());
        const newId = Number(result.lastInsertRowid);
        tagNameToId[tag.name] = newId;
        tagIdMap[tag.id] = newId;
      });
    }

    const todoIdMap: Record<number, number> = {};
    const todoInsert = db.prepare(`
      INSERT INTO todos (
        title,
        completed,
        due_date,
        priority,
        is_recurring,
        recurrence_pattern,
        reminder_minutes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    data.todos.forEach((todo: any) => {
      const result = todoInsert.run(
        todo.title,
        todo.completed ? 1 : 0,
        todo.due_date || null,
        todo.priority || 'medium',
        todo.is_recurring ? 1 : 0,
        todo.recurrence_pattern || null,
        todo.reminder_minutes ?? null,
        todo.created_at || new Date().toISOString(),
        todo.updated_at || new Date().toISOString()
      );
      todoIdMap[todo.id] = Number(result.lastInsertRowid);
    });

    const subtaskInsert = db.prepare(
      'INSERT INTO subtasks (todo_id, title, completed, position, created_at) VALUES (?, ?, ?, ?, ?)'
    );

    if (Array.isArray(data.subtasks)) {
      data.subtasks.forEach((subtask: any) => {
        const newTodoId = todoIdMap[subtask.todo_id];
        if (!newTodoId) return;
        subtaskInsert.run(
          newTodoId,
          subtask.title,
          subtask.completed ? 1 : 0,
          subtask.position || 0,
          subtask.created_at || new Date().toISOString()
        );
      });
    }

    const todoTagInsert = db.prepare(
      'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)'
    );

    if (Array.isArray(data.todo_tags)) {
      data.todo_tags.forEach((row: any) => {
        const newTodoId = todoIdMap[row.todo_id];
        const newTagId = tagIdMap[row.tag_id];
        if (!newTodoId || !newTagId) return;
        todoTagInsert.run(newTodoId, newTagId);
      });
    }

    return NextResponse.json({ success: true, imported: data.todos.length });
  } catch (error) {
    console.error('Error importing JSON:', error);
    return NextResponse.json(
      { error: 'Failed to import JSON' },
      { status: 500 }
    );
  }
}
