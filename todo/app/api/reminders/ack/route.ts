import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    const now = getSingaporeNow();
    const nowIso = toSingaporeISO(now);

    const stmt = db.prepare(`
      UPDATE todos 
      SET last_notification_sent = ?, updated_at = ? 
      WHERE id = ?
    `);

    const info = stmt.run(nowIso, nowIso, id);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging reminder:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge reminder' },
      { status: 500 }
    );
  }
}
