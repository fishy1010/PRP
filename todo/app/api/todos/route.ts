import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO, isValidFutureDate, isOverdue } from '@/lib/timezone';
import type { Todo, CreateTodoRequest, RecurrencePattern } from '@/types/todo';

// GET /api/todos - Get all todos
export async function GET() {
  try {
    const todos = db.prepare(`
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

    // Group todos
    const now = getSingaporeNow();
    const overdue: Todo[] = [];
    const pending: Todo[] = [];
    const completed: Todo[] = [];

    todos.forEach((todo) => {
      if (todo.completed) {
        completed.push(todo);
      } else if (todo.due_date && isOverdue(todo.due_date, todo.completed)) {
        overdue.push(todo);
      } else {
        pending.push(todo);
      }
    });

    return NextResponse.json({
      todos,
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
    const body: CreateTodoRequest = await request.json();
    const {
      title,
      due_date,
      priority = 'medium',
      is_recurring = false,
      recurrence_pattern,
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
      INSERT INTO todos (title, due_date, priority, is_recurring, recurrence_pattern, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      trimmedTitle,
      due_date || null,
      priority,
      is_recurring ? 1 : 0,
      is_recurring ? recurrence_pattern : null,
      now,
      now
    );

    const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid) as Todo;

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
