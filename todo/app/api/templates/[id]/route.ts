import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';
import type { Template, TemplateRequest } from '@/types/todo';
import { getSessionFromRequest } from '@/lib/auth';
const VALID_PRIORITIES = ['high', 'medium', 'low'];
const VALID_RECURRENCE = ['daily', 'weekly', 'monthly', 'yearly'];

const parseSubtasksJson = (value?: string) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error('Subtasks JSON must be an array of strings');
  }
  return JSON.stringify(parsed.map((item) => item.trim()).filter(Boolean));
};

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT /api/templates/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: Partial<TemplateRequest> = await request.json();

    const existing = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, session.sub) as Template | undefined;
    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: 'Template name is required' },
          { status: 400 }
        );
      }
      updates.push('name = ?');
      values.push(name);
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description ? body.description.trim() : null);
    }

    if (body.category !== undefined) {
      updates.push('category = ?');
      values.push(body.category ? body.category.trim() : null);
    }

    if (body.title_template !== undefined) {
      const titleTemplate = body.title_template.trim();
      if (!titleTemplate) {
        return NextResponse.json(
          { error: 'Title template is required' },
          { status: 400 }
        );
      }
      updates.push('title_template = ?');
      values.push(titleTemplate);
    }

    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json(
          { error: 'Invalid priority value' },
          { status: 400 }
        );
      }
      updates.push('priority = ?');
      values.push(body.priority);
    }

    if (body.is_recurring !== undefined) {
      updates.push('is_recurring = ?');
      values.push(body.is_recurring ? 1 : 0);
    }

    if (body.recurrence_pattern !== undefined) {
      if (body.recurrence_pattern && !VALID_RECURRENCE.includes(body.recurrence_pattern)) {
        return NextResponse.json(
          { error: 'Invalid recurrence pattern' },
          { status: 400 }
        );
      }
      updates.push('recurrence_pattern = ?');
      values.push(body.recurrence_pattern || null);
    }

    if (body.reminder_minutes !== undefined) {
      updates.push('reminder_minutes = ?');
      values.push(body.reminder_minutes ?? null);
    }

    if (body.subtasks_json !== undefined) {
      try {
        const parsed = parseSubtasksJson(body.subtasks_json);
        updates.push('subtasks_json = ?');
        values.push(parsed ?? null);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Invalid subtasks JSON' },
          { status: 400 }
        );
      }
    }

    if (body.due_date_offset_days !== undefined) {
      updates.push('due_date_offset_days = ?');
      values.push(body.due_date_offset_days ?? null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ template: existing });
    }

    updates.push('updated_at = ?');
    values.push(toSingaporeISO(getSingaporeNow()));
    values.push(id);

    db.prepare(`
      UPDATE templates
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const updated = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template;

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, session.sub) as Template | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM templates WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
