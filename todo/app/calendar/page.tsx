'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Holiday, TodoWithSubtasks } from '@/types/todo';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getSingaporeToday(): string {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

function getSingaporeMonth(): string {
  const d = new Date();
  const y = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric' });
  const m = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore', month: '2-digit' });
  return `${y}-${m}`;
}

interface CalendarDay {
  date: string;       // YYYY-MM-DD
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  holidays: Holiday[];
  todoCount: number;
}

function generateCalendarDays(
  year: number,
  month: number,
  todayStr: string,
  holidayMap: Map<string, Holiday[]>,
  todoCountMap: Map<string, number>
): CalendarDay[][] {
  const firstDay = new Date(year, month - 1, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  // Previous month trailing days
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  const cells: CalendarDay[] = [];

  // Leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = (startDow - i - 1 + 7) % 7; // recalculate, but simpler:
    cells.push({
      date: dateStr,
      day: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dow === 0 || dow === 6,
      holidays: holidayMap.get(dateStr) || [],
      todoCount: todoCountMap.get(dateStr) || 0,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = new Date(year, month - 1, d).getDay();
    cells.push({
      date: dateStr,
      day: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dow === 0 || dow === 6,
      holidays: holidayMap.get(dateStr) || [],
      todoCount: todoCountMap.get(dateStr) || 0,
    });
  }

  // Trailing days from next month
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(nextYear, nextMonth - 1, d).getDay();
      cells.push({
        date: dateStr,
        day: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: dow === 0 || dow === 6,
        holidays: holidayMap.get(dateStr) || [],
        todoCount: todoCountMap.get(dateStr) || 0,
      });
    }
  }

  // Split into weeks
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayStr = getSingaporeToday();
  const defaultMonth = getSingaporeMonth();
  const monthParam = searchParams.get('month') || defaultMonth;

  // Parse month
  const [year, month] = useMemo(() => {
    const parts = monthParam.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      const dp = defaultMonth.split('-');
      return [parseInt(dp[0], 10), parseInt(dp[1], 10)];
    }
    return [y, m];
  }, [monthParam, defaultMonth]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [todos, setTodos] = useState<TodoWithSubtasks[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [dayTodos, setDayTodos] = useState<TodoWithSubtasks[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [holidayRes, todoRes] = await Promise.all([
        fetch('/api/holidays'),
        fetch('/api/todos'),
      ]);
      const holidayData = await holidayRes.json();
      const todoData = await todoRes.json();
      setHolidays(holidayData.holidays || []);
      setTodos(todoData.todos || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build lookup maps
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const h of holidays) {
      const existing = map.get(h.date) || [];
      existing.push(h);
      map.set(h.date, existing);
    }
    return map;
  }, [holidays]);

  const todoCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of todos) {
      if (t.due_date) {
        // Extract YYYY-MM-DD from the due_date (which may be an ISO string)
        const dateStr = t.due_date.substring(0, 10);
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
    }
    return map;
  }, [todos]);

  // All todos keyed by date for the modal
  const todosByDate = useMemo(() => {
    const map = new Map<string, TodoWithSubtasks[]>();
    for (const t of todos) {
      if (t.due_date) {
        const dateStr = t.due_date.substring(0, 10);
        const existing = map.get(dateStr) || [];
        existing.push(t);
        map.set(dateStr, existing);
      }
    }
    return map;
  }, [todos]);

  const weeks = useMemo(
    () => generateCalendarDays(year, month, todayStr, holidayMap, todoCountMap),
    [year, month, todayStr, holidayMap, todoCountMap]
  );

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    let newYear = year;
    let newMonth = month;

    if (direction === 'today') {
      const parts = defaultMonth.split('-');
      newYear = parseInt(parts[0], 10);
      newMonth = parseInt(parts[1], 10);
    } else if (direction === 'prev') {
      newMonth -= 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    } else {
      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    }

    const newParam = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    router.push(`/calendar?month=${newParam}`);
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day);
    setDayTodos(todosByDate.get(day.date) || []);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Holiday Calendar</h1>
            <p className="text-gray-500 text-sm mt-1">Singapore public holidays &amp; your todos</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            ← Back to Todos
          </Link>
        </header>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-lg shadow-sm px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('prev')}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            ◀ Prev
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">{monthLabel}</h2>
            <button
              type="button"
              onClick={() => navigate('today')}
              className="px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('next')}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Next ▶
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-100 border-b">
            {DAY_NAMES.map((name, i) => (
              <div
                key={name}
                className={`py-2 text-center text-xs font-semibold uppercase tracking-wider ${
                  i === 0 || i === 6 ? 'text-red-500' : 'text-gray-600'
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`relative min-h-[80px] md:min-h-[100px] p-1.5 border-r last:border-r-0 text-left transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset ${
                    !day.isCurrentMonth ? 'bg-gray-50 opacity-40' : ''
                  } ${day.isToday ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''} ${
                    day.isWeekend && day.isCurrentMonth && !day.isToday ? 'bg-red-50/40' : ''
                  }`}
                >
                  {/* Day number */}
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                      day.isToday
                        ? 'bg-blue-600 text-white'
                        : day.isWeekend
                        ? 'text-red-500'
                        : 'text-gray-700'
                    }`}
                  >
                    {day.day}
                  </span>

                  {/* Holidays */}
                  <div className="mt-0.5 space-y-0.5">
                    {day.holidays.map((h) => (
                      <div
                        key={h.id}
                        className="text-[10px] leading-tight px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium truncate"
                        title={h.name}
                      >
                        {h.name}
                      </div>
                    ))}
                  </div>

                  {/* Todo count badge */}
                  {day.todoCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {day.todoCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
            Today
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-100 border border-red-200" />
            Holiday
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[8px] font-bold">3</span>
            Todos due
          </div>
        </div>
      </div>

      {/* Day Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h2>
                {selectedDay.holidays.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDay.holidays.map((h) => (
                      <span
                        key={h.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium"
                      >
                        {h.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {dayTodos.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No todos due on this day.</p>
              ) : (
                <ul className="space-y-2">
                  {dayTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        todo.completed
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <span
                        className={`mt-0.5 text-sm ${
                          todo.completed ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {todo.completed ? '✅' : '⬜'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            todo.completed ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {todo.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                            {todo.priority}
                          </span>
                          {todo.is_recurring && (
                            <span className="text-xs text-purple-600">🔄 {todo.recurrence_pattern}</span>
                          )}
                          {todo.subtasks && todo.subtasks.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {todo.subtasks.filter((s) => s.completed).length}/{todo.subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                        {todo.tags && todo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {todo.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: tag.color + '30', color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
