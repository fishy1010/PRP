import { test, expect } from '@playwright/test';

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getSingaporeToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

function getSingaporeMonth(): string {
  const d = new Date();
  const y = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric' });
  const m = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore', month: '2-digit' });
  return `${y}-${m}`;
}

test.describe('Feature 10: Calendar View', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clean up all todos
    const response = await request.get('http://localhost:3000/api/todos');
    const data = await response.json();
    const allTodos = data.todos || [];
    for (const todo of allTodos) {
      await request.delete(`http://localhost:3000/api/todos/${todo.id}`);
    }
  });

  test('should load calendar page with current month', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Should display current month
    const today = new Date();
    const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator(`h2:has-text("${monthLabel}")`)).toBeVisible();

    // Should have day headers
    await expect(page.locator('text=Sun')).toBeVisible();
    await expect(page.locator('text=Sat')).toBeVisible();
  });

  test('should navigate to previous month', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Get current month
    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Click prev button
    await page.click('button:has-text("Prev")');
    await page.waitForTimeout(500);

    // Previous month should be different
    const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonth = prevDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator(`h2:has-text("${prevMonth}")`)).toBeVisible();

    // URL should have month param
    expect(page.url()).toContain('month=');
  });

  test('should navigate to next month', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Click next button
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Next month
    const today = new Date();
    const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonth = nextDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator(`h2:has-text("${nextMonth}")`)).toBeVisible();
  });

  test('should return to current month with Today button', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Navigate away
    await page.click('button:has-text("Prev")');
    await page.click('button:has-text("Prev")');
    await page.waitForTimeout(500);

    // Click Today
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    await expect(page.locator(`h2:has-text("${currentMonth}")`)).toBeVisible();
  });

  test('should display holiday on correct date', async ({ page }) => {
    // Navigate to a known month with holidays
    // Using 2026-02 which has Chinese New Year
    await page.goto('/calendar?month=2026-02');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Should show "February 2026"
    await expect(page.locator('h2:has-text("February 2026")')).toBeVisible();

    // Should have Chinese New Year holiday displayed
    await expect(page.locator('text=Chinese New Year').first()).toBeVisible();
  });

  test('should show todo on correct date', async ({ page, request }) => {
    // Create a todo with a specific due date
    const dueDate = new Date();
    dueDate.setDate(15); // 15th of current month
    dueDate.setHours(10, 0, 0, 0);

    await request.post('http://localhost:3000/api/todos', {
      data: {
        title: 'Calendar Test Todo',
        due_date: dueDate.toISOString(),
        priority: 'high',
      },
    });

    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Should have a badge for the 15th (todo count)
    // The badge appears as a number on the day cell
    const dayCell = page.locator('button').filter({ hasText: '15' }).first();
    await expect(dayCell).toBeVisible();

    // Should have a badge with count 1
    await expect(page.locator('.bg-blue-600.text-white:has-text("1")')).toBeVisible();
  });

  test('should open modal when clicking on a day', async ({ page, request }) => {
    // Create a todo for today
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    await request.post('http://localhost:3000/api/todos', {
      data: {
        title: 'Modal Test Todo',
        due_date: today.toISOString(),
        priority: 'medium',
      },
    });

    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Click on today's date
    const todayDay = today.getDate();
    // Today should be highlighted with ring, click on it
    const todayCell = page.locator('button.ring-2.ring-blue-400').first();
    await todayCell.click();

    // Modal should open with the todo
    await expect(page.locator('text=Modal Test Todo')).toBeVisible();

    // Modal should have close button
    await expect(page.locator('svg').first()).toBeVisible();

    // Close modal by clicking outside
    await page.click('.fixed.inset-0');
    await expect(page.locator('text=Modal Test Todo')).not.toBeVisible();
  });

  test('should navigate from main page to calendar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1:has-text("Todo App")');

    // Click calendar link
    await page.click('a:has-text("Calendar")');
    await page.waitForURL(/\/calendar/);

    await expect(page.locator('h1:has-text("Holiday Calendar")')).toBeVisible();
  });

  test('should navigate from calendar back to todos', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Click back link
    await page.click('a:has-text("Back to Todos")');
    await page.waitForURL('/');

    await expect(page.locator('h1:has-text("Todo App")')).toBeVisible();
  });

  test('should highlight today with special styling', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForSelector('h1:has-text("Holiday Calendar")');

    // Today should have a blue ring
    const todayCell = page.locator('button.ring-2.ring-blue-400');
    await expect(todayCell).toBeVisible();

    // Today's number should have blue background
    const todayNumber = page.locator('.bg-blue-600.text-white.rounded-full');
    await expect(todayNumber.first()).toBeVisible();
  });
});
