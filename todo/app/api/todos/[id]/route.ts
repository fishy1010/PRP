import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO, isValidFutureDate, getNextRecurrenceDate } from '@/lib/timezone';
import type { Todo, UpdateTodoRequest, Subtask, TodoWithSubtasks, Tag, RecurrencePattern } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/todos/[id] - Get a single todo
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    const subtasks = db.prepare(`
      SELECT * FROM subtasks
      WHERE todo_id = ?
      ORDER BY position ASC
    `).all(id) as Subtask[];

    const tags = db.prepare(`
      SELECT t.*
      FROM todo_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE tt.todo_id = ? AND t.user_id = ?
      ORDER BY t.name ASC
    `).all(id, session.sub) as Tag[];

    const normalizedSubtasks = subtasks.map((subtask) => ({
      ...subtask,
      completed: Boolean(subtask.completed),
    }));

    const total = normalizedSubtasks.length;
    const completed = normalizedSubtasks.filter((s) => s.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    const todoWithSubtasks: TodoWithSubtasks = {
      ...todo,
      subtasks: normalizedSubtasks,
      subtask_progress: { completed, total, percentage },
      tags,
    };

    return NextResponse.json(todoWithSubtasks);
  } catch (error) {
    console.error('Error fetching todo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todo' },
      { status: 500 }
    );
  }
}

// PUT /api/todos/[id] - Update a todo
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateTodoRequest = await request.json();
    const { title, due_date, priority, completed, is_recurring, recurrence_pattern, reminder_minutes } = body;

    // Check if todo exists
    const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    const existingIsRecurring = Boolean(existingTodo.is_recurring);
    const existingCompleted = Boolean(existingTodo.completed);

    // Validation
    if (title !== undefined && title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    if (due_date !== undefined && due_date !== null && !isValidFutureDate(due_date)) {
      return NextResponse.json(
        { error: 'Due date must be at least 1 minute in the future' },
        { status: 400 }
      );
    }

    if (priority !== undefined && !['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    const allowedPatterns: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];
    if (recurrence_pattern !== undefined && recurrence_pattern !== null && !allowedPatterns.includes(recurrence_pattern)) {
      return NextResponse.json(
        { error: 'Invalid recurrence pattern' },
        { status: 400 }
      );
    }

    const nextIsRecurring = is_recurring !== undefined ? is_recurring : existingIsRecurring;
    const nextDueDate = due_date !== undefined ? due_date : existingTodo.due_date;
    const nextPattern =
      recurrence_pattern !== undefined ? recurrence_pattern : existingTodo.recurrence_pattern;

    if (nextIsRecurring) {
      if (!nextDueDate) {
        return NextResponse.json(
          { error: 'Due date is required for recurring todos' },
          { status: 400 }
        );
      }

      if (!nextPattern || !allowedPatterns.includes(nextPattern)) {
        return NextResponse.json(
          { error: 'Recurrence pattern is required for recurring todos' },
          { status: 400 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }

    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date || null);
    }

    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }

    if (completed !== undefined) {
      updates.push('completed = ?');
      values.push(completed ? 1 : 0);
    }

    if (is_recurring !== undefined) {
      updates.push('is_recurring = ?');
      values.push(is_recurring ? 1 : 0);
    }

    if (recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?');
      values.push(recurrence_pattern);
    } else if (is_recurring === false) {
      updates.push('recurrence_pattern = ?');
      values.push(null);
    }

    if (reminder_minutes !== undefined) {
      updates.push('reminder_minutes = ?');
      values.push(reminder_minutes);
    }

    // If due date or reminder changed, reset notification
    if ((due_date !== undefined && due_date !== existingTodo.due_date) ||
        (reminder_minutes !== undefined && reminder_minutes !== existingTodo.reminder_minutes)) {
      updates.push('last_notification_sent = ?');
      values.push(null);
    }

    if (updates.length === 0) {
      return NextResponse.json(existingTodo);
    }

    const now = toSingaporeISO(getSingaporeNow());
    const willBeCompleted = completed !== undefined ? completed : existingCompleted;
    const shouldCreateNext =
      !existingCompleted &&
      willBeCompleted &&
      nextIsRecurring &&
      !!nextDueDate &&
      !!nextPattern;

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const updateStmt = db.prepare(`
      UPDATE todos 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const insertStmt = db.prepare(`
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      updateStmt.run(...values);

      if (shouldCreateNext) {
        const nextDueDateValue = getNextRecurrenceDate(nextDueDate as string, nextPattern as RecurrencePattern);
        insertStmt.run(
          title !== undefined ? title.trim() : existingTodo.title,
          0,
          nextDueDateValue,
          priority !== undefined ? priority : existingTodo.priority,
          1,
          nextPattern,
          reminder_minutes !== undefined ? reminder_minutes : existingTodo.reminder_minutes,
          now,
          now
        );
      }
    });

    transaction();

    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo;
    const subtasks = db.prepare(`
      SELECT * FROM subtasks
      WHERE todo_id = ?
      ORDER BY position ASC
    `).all(id) as Subtask[];

    const tags = db.prepare(`
      SELECT t.*
      FROM todo_tags tt
      JOIN tags t ON t.id = tt.tag_id
      WHERE tt.todo_id = ? AND t.user_id = ?
      ORDER BY t.name ASC
    `).all(id, session.sub) as Tag[];

    const normalizedSubtasks = subtasks.map((subtask) => ({
      ...subtask,
      completed: Boolean(subtask.completed),
    }));

    const total = normalizedSubtasks.length;
    const completedCount = normalizedSubtasks.filter((s) => s.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);

    const todoWithSubtasks: TodoWithSubtasks = {
      ...updatedTodo,
      subtasks: normalizedSubtasks,
      subtask_progress: { completed: completedCount, total, percentage },
      tags,
    };

    return NextResponse.json(todoWithSubtasks);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

// DELETE /api/todos/[id] - Delete a todo
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Check if todo exists
    const existingTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
    if (!existingTodo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
