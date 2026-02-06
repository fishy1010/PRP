'use client';

import { useEffect, useState } from 'react';
import { Todo } from '@/types/todo';

export default function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    const checkReminders = async () => {
      if (permission !== 'granted') return;

      try {
        const res = await fetch('/api/reminders/check');
        if (!res.ok) return;

        const data = await res.json();
        const todos: Todo[] = data.todos;

        todos.forEach(todo => {
          const notification = new Notification(`Reminder: ${todo.title}`, {
            body: todo.due_date 
              ? `Due at ${new Date(todo.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
              : 'Upcoming task',
            icon: '/favicon.ico',
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          // Acknowledge immediately so we don't spam
          fetch('/api/reminders/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: todo.id }),
          });
        });
      } catch (err) {
        console.error('Error checking reminders', err);
      }
    };

    if (permission === 'granted') {
      // Check immediately
      checkReminders();
      // Then check every minute
      const interval = setInterval(checkReminders, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [permission]);

  if (permission === 'granted' || permission === 'denied') {
    return null; // No need to show button if already decided
  }

  return (
    <button
      onClick={requestPermission}
      className="ml-4 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm text-yellow-800 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors flex items-center gap-2"
    >
      <span>🔔</span>
      Enable Notifications
    </button>
  );
}
