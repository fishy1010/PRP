/**
 * Singapore Timezone Utilities
 * All date/time operations use Asia/Singapore timezone
 */

const SINGAPORE_TZ = 'Asia/Singapore';

/**
 * Get current date/time in Singapore timezone
 */
export function getSingaporeNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SINGAPORE_TZ }));
}

/**
 * Convert a date string to Singapore timezone Date object
 */
export function toSingaporeDate(dateString: string): Date {
  const date = new Date(dateString);
  return new Date(date.toLocaleString('en-US', { timeZone: SINGAPORE_TZ }));
}

/**
 * Format a date to ISO string in Singapore timezone
 */
export function toSingaporeISO(date: Date): string {
  const singaporeDate = new Date(date.toLocaleString('en-US', { timeZone: SINGAPORE_TZ }));
  return singaporeDate.toISOString();
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildDateWithSameTime(base: Date, year: number, monthIndex: number, day: number): Date {
  const next = new Date(base);
  next.setFullYear(year, monthIndex, 1);
  next.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
  next.setDate(day);
  return next;
}

/**
 * Calculate next recurrence date in Singapore timezone.
 */
export function getNextRecurrenceDate(
  dueDateString: string,
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  const base = toSingaporeDate(dueDateString);
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();

  let next: Date;

  switch (pattern) {
    case 'daily':
      next = new Date(base);
      next.setDate(day + 1);
      break;
    case 'weekly':
      next = new Date(base);
      next.setDate(day + 7);
      break;
    case 'monthly': {
      const targetMonth = month + 1;
      const targetYear = year + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const daysInTarget = getDaysInMonth(targetYear, normalizedMonth);
      const targetDay = Math.min(day, daysInTarget);
      next = buildDateWithSameTime(base, targetYear, normalizedMonth, targetDay);
      break;
    }
    case 'yearly': {
      const targetYear = year + 1;
      const daysInTarget = getDaysInMonth(targetYear, month);
      const targetDay = Math.min(day, daysInTarget);
      next = buildDateWithSameTime(base, targetYear, month, targetDay);
      break;
    }
    default:
      next = new Date(base);
      break;
  }

  return toSingaporeISO(next);
}

/**
 * Check if a due date is in the future (Singapore timezone)
 * Minimum 1 minute in the future
 */
export function isValidFutureDate(dueDateString: string): boolean {
  const dueDate = new Date(dueDateString);
  const now = getSingaporeNow();
  const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
  
  return dueDate >= oneMinuteFromNow;
}

/**
 * Check if a todo is overdue (Singapore timezone)
 */
export function isOverdue(dueDateString: string | null, completed: boolean): boolean {
  if (!dueDateString || completed) return false;
  
  const dueDate = new Date(dueDateString);
  const now = getSingaporeNow();
  
  return dueDate < now;
}

/**
 * Get relative time string (e.g., "in 2 hours", "3 days overdue")
 */
export function getRelativeTime(dueDateString: string): { text: string; color: string } {
  const dueDate = new Date(dueDateString);
  const now = getSingaporeNow();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Overdue
  if (diffMs < 0) {
    const overdueMins = Math.abs(diffMins);
    const overdueHours = Math.abs(diffHours);
    const overdueDays = Math.abs(diffDays);

    if (overdueMins < 60) {
      return { text: `${overdueMins} minute${overdueMins !== 1 ? 's' : ''} overdue`, color: 'red' };
    } else if (overdueHours < 24) {
      return { text: `${overdueHours} hour${overdueHours !== 1 ? 's' : ''} overdue`, color: 'red' };
    } else {
      return { text: `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`, color: 'red' };
    }
  }

  // Less than 1 hour
  if (diffMins < 60) {
    return { text: `Due in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`, color: 'red' };
  }

  // Less than 24 hours
  if (diffHours < 24) {
    const timestamp = dueDate.toLocaleString('en-SG', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: SINGAPORE_TZ 
    });
    return { text: `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''} (${timestamp})`, color: 'orange' };
  }

  // Less than 7 days
  if (diffDays < 7) {
    const timestamp = dueDate.toLocaleString('en-SG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: SINGAPORE_TZ
    });
    return { text: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''} (${timestamp})`, color: 'yellow' };
  }

  // 7+ days
  const timestamp = dueDate.toLocaleString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SINGAPORE_TZ
  });
  return { text: timestamp, color: 'blue' };
}
