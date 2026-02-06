import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';
import type { Template, TemplateRequest } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';
const VALID_PRIORITIES = ['high', 'medium', 'low'];
const VALID_RECURRENCE = ['daily', 'weekly', 'monthly', 'yearly'];

const parseSubtasksJson = (value?: string) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error('Subtasks JSON must be an array of strings');
  }
  return JSON.stringify(parsed.map((item) => item.trim()).filter(Boolean));
};

// GET /api/templates
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = db.prepare(`
      SELECT * FROM templates
      WHERE user_id = ?
      ORDER BY category ASC NULLS LAST, name ASC
    `).all(session.sub) as Template[];

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TemplateRequest = await request.json();
    const name = (body.name || '').trim();
    const titleTemplate = (body.title_template || '').trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!titleTemplate) {
      return NextResponse.json(
        { error: 'Title template is required' },
        { status: 400 }
      );
    }

    const priority = body.priority || 'medium';
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    const isRecurring = Boolean(body.is_recurring);
    const recurrencePattern = body.recurrence_pattern || null;
    if (isRecurring && recurrencePattern && !VALID_RECURRENCE.includes(recurrencePattern)) {
      return NextResponse.json(
        { error: 'Invalid recurrence pattern' },
        { status: 400 }
      );
    }

    let subtasksJson: string | null = null;
    try {
      subtasksJson = parseSubtasksJson(body.subtasks_json);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid subtasks JSON' },
        { status: 400 }
      );
    }

    const now = toSingaporeISO(getSingaporeNow());
    const stmt = db.prepare(`
      INSERT INTO templates (
        user_id,
        name,
        description,
        category,
        title_template,
        priority,
        is_recurring,
        recurrence_pattern,
        reminder_minutes,
        subtasks_json,
        due_date_offset_days,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      session.sub,
      name,
      body.description ? body.description.trim() : null,
      body.category ? body.category.trim() : null,
      titleTemplate,
      priority,
      isRecurring ? 1 : 0,
      isRecurring ? recurrencePattern : null,
      body.reminder_minutes ?? null,
      subtasksJson,
      body.due_date_offset_days ?? null,
      now,
      now
    );

    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid) as Template;

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
