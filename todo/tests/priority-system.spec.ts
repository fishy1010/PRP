import { test, expect } from '@playwright/test';

test.describe('Feature 02: Priority System', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clear all todos before each test
    const response = await request.get('http://localhost:3000/api/todos');
    const data = await response.json();
    const allTodos = data.todos || [];
    
    for (const todo of allTodos) {
      await request.delete(`http://localhost:3000/api/todos/${todo.id}`);
    }
    
    await page.goto('/');
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Todo App")');
  });

  test('should create todo with each priority level', async ({ page }) => {
    const priorities = ['High', 'Medium', 'Low'];

    for (const priority of priorities) {
      // Fill in the todo form
      await page.fill('input[placeholder="Add a new todo..."]', `${priority} Priority Task`);
      
      // Select priority - use value instead of label since values are lowercase
      const priorityValue = priority.toLowerCase();
      await page.selectOption('select', { value: priorityValue });
      
      // Submit form
      await page.click('button:has-text("Add")');
      
      // Wait for todo to appear with timeout
      await page.waitForSelector(`text=${priority} Priority Task`, { timeout: 10000 });
      
      // Verify priority badge is visible - look for span with specific class
      const badge = page.locator(`span:has-text("${priority}")`).filter({ has: page.locator('.rounded-full') }).first();
      await expect(badge).toBeVisible();
      
      // Small delay between iterations
      await page.waitForTimeout(500);
    }
  });

  test('should display priority badges with correct colors', async ({ page }) => {
    // Create high priority todo
    await page.fill('input[placeholder="Add a new todo..."]', 'High Priority Task');
    await page.selectOption('select', { label: 'High' });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=High Priority Task');

    // Check that high priority badge exists with specific selector
    const highBadge = page.locator('text=High Priority Todo').locator('..').locator('span.rounded-full:has-text("High")').first();
    await expect(highBadge).toBeVisible();
    
    // Verify badge classes contain color information
    const badgeClass = await highBadge.getAttribute('class');
    expect(badgeClass).toContain('red'); // High priority should have red color
  });

  test('should filter by priority', async ({ page }) => {
    // Create todos with different priorities
    const todos = [
      { title: 'High Priority Todo', priority: 'High', value: 'high' },
      { title: 'Medium Priority Todo', priority: 'Medium', value: 'medium' },
      { title: 'Low Priority Todo', priority: 'Low', value: 'low' }
    ];

    for (const todo of todos) {
      await page.fill('input[placeholder="Add a new todo..."]', todo.title);
      await page.selectOption('select', { value: todo.value });
      await page.click('button:has-text("Add")');
      await page.waitForSelector(`text=${todo.title}`, { timeout: 10000 });
      await page.waitForTimeout(500);
    }

    // Test filtering by High priority
    await page.selectOption('select:below(:text("Filter by Priority"))', { label: 'High Priority' });
    
    // High priority task should be visible
    await expect(page.locator('text=High Priority Task')).toBeVisible();
    
    // Medium and Low priority tasks should not be visible
    await expect(page.locator('text=Medium Priority Task')).not.toBeVisible();
    await expect(page.locator('text=Low Priority Task')).not.toBeVisible();

    // Test filtering by All Priorities
    await page.selectOption('select:below(:text("Filter by Priority"))', { label: 'All Priorities' });
    
    // All tasks should be visible again
    await expect(page.locator('text=High Priority Task')).toBeVisible();
    await expect(page.locator('text=Medium Priority Task')).toBeVisible();
    await expect(page.locator('text=Low Priority Task')).toBeVisible();
  });

  test('should verify automatic sorting by priority', async ({ page }) => {
    // Create todos in reverse priority order
    const todos = [
      { title: 'Low Priority Task', priority: 'Low' },
      { title: 'Medium Priority Task', priority: 'Medium' },
      { title: 'High Priority Task', priority: 'High' },
    ];

    for (const todo of todos) {
      await page.fill('input[placeholder="Add a new todo..."]', todo.title);
      await page.selectOption('select', { label: todo.priority });
      await page.click('button:has-text("Add")');
      await page.waitForSelector(`text=${todo.title}`);
    }

    // Get all todo titles in order
    const todoTitles = await page.locator('h3').allTextContents();
    
    // High priority should appear before Medium and Low
    const highIndex = todoTitles.findIndex(t => t.includes('High Priority Task'));
    const mediumIndex = todoTitles.findIndex(t => t.includes('Medium Priority Task'));
    const lowIndex = todoTitles.findIndex(t => t.includes('Low Priority Task'));
    
    expect(highIndex).toBeLessThan(mediumIndex);
    expect(mediumIndex).toBeLessThan(lowIndex);
  });

  test('should edit todo priority', async ({ page }) => {
    // Create a medium priority todo
    await page.fill('input[placeholder="Add a new todo..."]', 'Edit Priority Test');
    await page.selectOption('select', { label: 'Medium' });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=Edit Priority Test');

    // Click Edit button
    await page.click('button:has-text("Edit")');

    // Change priority to High
    await page.selectOption('select:below(:text("Edit Priority Test"))', { value: 'high' });
    
    // Save changes
    await page.click('button:has-text("Update")');

    // Verify the priority badge changed to High
    await expect(page.locator('text=Edit Priority Test').locator('..').locator('span:has-text("High")')).toBeVisible();
  });

  test('should show priority visual indicator when filter is active', async ({ page }) => {
    // Create a high priority todo
    await page.fill('input[placeholder="Add a new todo..."]', 'Test Task');
    await page.selectOption('select', { label: 'High' });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=Test Task');

    // Select high priority filter
    await page.selectOption('select:below(:text("Filter by Priority"))', { label: 'High Priority' });

    // Verify the visual indicator appears
    await expect(page.locator('text=Showing:')).toBeVisible();
    await expect(page.locator('text=High Priority').last()).toBeVisible();
  });

  test('should maintain priority when toggling completion', async ({ page }) => {
    // Create a high priority todo
    await page.fill('input[placeholder="Add a new todo..."]', 'Complete Test');
    await page.selectOption('select', { label: 'High' });
    await page.click('button:has-text("Add")');
    await page.waitForSelector('text=Complete Test');

    // Get the todo checkbox and check it
    const checkbox = page.locator('text=Complete Test').locator('..').locator('input[type="checkbox"]');
    await checkbox.check();

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Verify high priority badge still exists
    await expect(page.locator('text=High').first()).toBeVisible();
  });
});
