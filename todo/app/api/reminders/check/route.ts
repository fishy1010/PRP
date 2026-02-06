import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { Todo } from '@/types/todo';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET() {
  try {
    // Get pending tasks with reminders that haven't been notified yet
    // filtering by logic in JS for safer timezone handling
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE completed = 0 
      AND reminder_minutes IS NOT NULL 
      AND last_notification_sent IS NULL
      AND due_date IS NOT NULL
    `);
    
    const candidates = stmt.all() as Todo[];
    const now = getSingaporeNow();
    
    console.log(`[Reminders Check] Now(SG): ${now.toISOString()}`);
    console.log(`[Reminders Check] Candidates found: ${candidates.length}`);

    const todosToRemind = candidates.filter(todo => {
      if (!todo.due_date || !todo.reminder_minutes) return false;
      
      // FIX: Ensure due_date is treated as UTC to match getSingaporeNow() logic
      // todo.due_date from datetime-local is "YYYY-MM-DDTHH:mm"
      const dueDateStr = todo.due_date.endsWith('Z') ? todo.due_date : `${todo.due_date}Z`;
      const dueDate = new Date(dueDateStr);
      
      // Calculate trigger time: due_date - reminder_minutes
      const triggerTime = new Date(dueDate.getTime() - (todo.reminder_minutes * 60 * 1000));
      
      const shouldRemind = now >= triggerTime;

      console.log(`[Reminders Check] Todo ${todo.id}: "${todo.title}"`);
      console.log(`  Due Date: ${todo.due_date} -> ${dueDate.toISOString()}`);
      console.log(`  Reminder Mins: ${todo.reminder_minutes}`);
      console.log(`  Trigger Time: ${triggerTime.toISOString()}`);
      console.log(`  Now >= Trigger? ${shouldRemind}`);

      // If current time is past the trigger time, we should remind
      return shouldRemind;
    });

    console.log(`[Reminders Check] Dispatching reminders for: ${todosToRemind.map(t => t.id).join(',')}`);
    return NextResponse.json({ todos: todosToRemind });
  } catch (error) {
    console.error('Error checking reminders:', error);
    return NextResponse.json(
      { error: 'Failed to check reminders' },
      { status: 500 }
    );
  }
}
