import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const holidays = db.prepare('SELECT id, date, name FROM holidays ORDER BY date ASC').all();
    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}
