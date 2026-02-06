import { test, expect } from '@playwright/test';

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

test.describe('Feature 03: Recurring Todos', () => {
  test.beforeEach(async ({ page, request }) => {
    const response = await request.get('http://localhost:3000/api/todos');
    const data = await response.json();
    const allTodos = data.todos || [];

    for (const todo of allTodos) {
      await request.delete(`http://localhost:3000/api/todos/${todo.id}`);
    }

    await page.goto('/');
    await page.waitForSelector('h1:has-text("Todo App")');
  });

  test('should create daily recurring todo with badge', async ({ page }) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 2);
    dueDate.setSeconds(0, 0);

    await page.fill('input[placeholder="Add a new todo..."]', 'Daily Recurring Todo');
    await page.fill('input[type="datetime-local"]', formatDateTimeLocal(dueDate));

    await page.click('button:has-text("Show Advanced Options")');
    await page.check('#repeat-toggle');
    await page.selectOption('select:below(:text("Recurrence Pattern"))', { value: 'daily' });

    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=Daily Recurring Todo', { timeout: 10000 });
    await expect(page.locator('span:has-text("🔄 daily")')).toBeVisible();
  });

  test('should create weekly recurring todo with badge', async ({ page }) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    dueDate.setSeconds(0, 0);

    await page.fill('input[placeholder="Add a new todo..."]', 'Weekly Recurring Todo');
    await page.fill('input[type="datetime-local"]', formatDateTimeLocal(dueDate));

    await page.click('button:has-text("Show Advanced Options")');
    await page.check('#repeat-toggle');
    await page.selectOption('select:below(:text("Recurrence Pattern"))', { value: 'weekly' });

    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=Weekly Recurring Todo', { timeout: 10000 });
    await expect(page.locator('span:has-text("🔄 weekly")')).toBeVisible();
  });

  test('should create next instance on completion with correct due date and priority', async ({ page, request }) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 4);
    dueDate.setSeconds(0, 0);

    await page.fill('input[placeholder="Add a new todo..."]', 'Recurring Completion Todo');
    await page.selectOption('select', { value: 'high' });
    await page.fill('input[type="datetime-local"]', formatDateTimeLocal(dueDate));
    await page.click('button:has-text("Show Advanced Options")');
    await page.check('#repeat-toggle');
    await page.selectOption('select:below(:text("Recurrence Pattern"))', { value: 'daily' });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=Recurring Completion Todo', { timeout: 10000 });

    const checkbox = page
      .locator('text=Recurring Completion Todo')
      .locator('..')
      .locator('input[type="checkbox"]');
    await checkbox.check();
    await page.waitForTimeout(500);

    const response = await request.get('http://localhost:3000/api/todos');
    const data = await response.json();
    const pendingTodos = data.pending || [];
    const nextInstance = pendingTodos.find((todo: any) => todo.title === 'Recurring Completion Todo');

    expect(nextInstance).toBeTruthy();
    expect(nextInstance.priority).toBe('high');

    const expectedDiff = 1;
    const actualDiff = diffDays(dueDate, new Date(nextInstance.due_date));
    expect(actualDiff).toBe(expectedDiff);
  });

  test('should allow disabling recurrence', async ({ page, request }) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    dueDate.setSeconds(0, 0);

    await page.fill('input[placeholder="Add a new todo..."]', 'Disable Recurrence Todo');
    await page.fill('input[type="datetime-local"]', formatDateTimeLocal(dueDate));
    await page.click('button:has-text("Show Advanced Options")');
    await page.check('#repeat-toggle');
    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=Disable Recurrence Todo', { timeout: 10000 });

    await page.click('button:has-text("Edit")');
    await page.uncheck('input[type="checkbox"]:below(:text("Repeat"))');
    await page.click('button:has-text("Update")');

    await expect(page.locator('span:has-text("🔄")')).not.toBeVisible();

    const checkbox = page
      .locator('text=Disable Recurrence Todo')
      .locator('..')
      .locator('input[type="checkbox"]');
    await checkbox.check();
    await page.waitForTimeout(500);

    const response = await request.get('http://localhost:3000/api/todos');
    const data = await response.json();
    const pendingTodos = data.pending || [];
    const nextInstance = pendingTodos.find((todo: any) => todo.title === 'Disable Recurrence Todo');

    expect(nextInstance).toBeFalsy();
  });
});
