import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO, isValidFutureDate, isOverdue } from '@/lib/timezone';
import type { Todo, CreateTodoRequest, Subtask, TodoWithSubtasks, Tag, RecurrencePattern } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';

// GET /api/todos - Get all todos
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tagFilter = request.nextUrl.searchParams.get('tag_id');
    const tagId = tagFilter ? Number(tagFilter) : null;

    const todos = tagId
      ? db.prepare(`
          SELECT DISTINCT todos.* FROM todos
          INNER JOIN todo_tags ON todo_tags.todo_id = todos.id
          WHERE todo_tags.tag_id = ?
          ORDER BY 
            CASE priority 
              WHEN 'high' THEN 1 
              WHEN 'medium' THEN 2 
              WHEN 'low' THEN 3 
            END,
            due_date ASC NULLS LAST,
            created_at DESC
        `).all(tagId) as Todo[]
      : db.prepare(`
          SELECT * FROM todos 
          ORDER BY 
            CASE priority 
              WHEN 'high' THEN 1 
              WHEN 'medium' THEN 2 
              WHEN 'low' THEN 3 
            END,
            due_date ASC NULLS LAST,
            created_at DESC
        `).all() as Todo[];

    const subtasks = db.prepare(`
      SELECT * FROM subtasks
      ORDER BY todo_id ASC, position ASC
    `).all() as Subtask[];

    const tagRows = db.prepare(`
      SELECT tt.todo_id, t.*
      FROM todo_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE t.user_id = ?
      ORDER BY t.name ASC
    `).all(session.sub) as (Tag & { todo_id: number })[];

    const subtasksByTodo = subtasks.reduce<Record<number, Subtask[]>>((acc, subtask) => {
      const completed = Boolean(subtask.completed);
      const normalized: Subtask = { ...subtask, completed };
      if (!acc[subtask.todo_id]) acc[subtask.todo_id] = [];
      acc[subtask.todo_id].push(normalized);
      return acc;
    }, {});

    const tagsByTodo = tagRows.reduce<Record<number, Tag[]>>((acc, row) => {
      const { todo_id, ...tag } = row;
      if (!acc[todo_id]) acc[todo_id] = [];
      acc[todo_id].push(tag);
      return acc;
    }, {});

    const todosWithSubtasks = todos.map((todo) => {
      const todoSubtasks = subtasksByTodo[todo.id] || [];
      const total = todoSubtasks.length;
      const completed = todoSubtasks.filter((s) => s.completed).length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        ...todo,
        subtasks: todoSubtasks,
        subtask_progress: { completed, total, percentage },
        tags: tagsByTodo[todo.id] || [],
      } as TodoWithSubtasks;
    });

    // Group todos
    const now = getSingaporeNow();
    const overdue: Todo[] = [];
    const pending: Todo[] = [];
    const completed: Todo[] = [];

    todosWithSubtasks.forEach((todo) => {
      if (todo.completed) {
        completed.push(todo);
      } else if (todo.due_date && isOverdue(todo.due_date, todo.completed)) {
        overdue.push(todo);
      } else {
        pending.push(todo);
      }
    });

    return NextResponse.json({
      todos: todosWithSubtasks,
      overdue,
      pending,
      completed,
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

// POST /api/todos - Create a new todo
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateTodoRequest = await request.json();
    const {
      title,
      due_date,
      priority = 'medium',
      is_recurring = false,
      recurrence_pattern,
      reminder_minutes,
      tag_ids,
    } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate due date if provided
    if (due_date && !isValidFutureDate(due_date)) {
      return NextResponse.json(
        { error: 'Due date must be at least 1 minute in the future' },
        { status: 400 }
      );
    }

    if (is_recurring && !due_date) {
      return NextResponse.json(
        { error: 'Due date is required for recurring todos' },
        { status: 400 }
      );
    }

    // Validate priority
    if (!['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    const allowedPatterns: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];
    if (is_recurring && !recurrence_pattern) {
      return NextResponse.json(
        { error: 'Recurrence pattern is required for recurring todos' },
        { status: 400 }
      );
    }

    if (recurrence_pattern && !allowedPatterns.includes(recurrence_pattern)) {
      return NextResponse.json(
        { error: 'Invalid recurrence pattern' },
        { status: 400 }
      );
    }

    const now = toSingaporeISO(getSingaporeNow());
    const trimmedTitle = title.trim();

        const stmt = db.prepare(`
      INSERT INTO todos (title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
      trimmedTitle,
      due_date || null,
      priority,
      is_recurring ? 1 : 0,
      is_recurring ? recurrence_pattern : null,
      reminder_minutes || null,
      now,
      now
        );

    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      const validTags = db.prepare(`
        SELECT id FROM tags WHERE user_id = ? AND id IN (${tag_ids.map(() => '?').join(',')})
      `).all(session.sub, ...tag_ids) as { id: number }[];

      const uniqueIds = Array.from(new Set(validTags.map((t) => t.id)));
      const insertTag = db.prepare(`
        INSERT OR IGNORE INTO todo_tags (todo_id, tag_id)
        VALUES (?, ?)
      `);

      uniqueIds.forEach((tagId) => {
        insertTag.run(result.lastInsertRowid, tagId);
      });
    }

    const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid) as Todo;
    const tags = db.prepare(`
      SELECT t.*
      FROM todo_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE tt.todo_id = ?
      ORDER BY t.name ASC
    `).all(result.lastInsertRowid) as Tag[];

    return NextResponse.json({ ...newTodo, tags }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
