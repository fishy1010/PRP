# PRP 01: Todo CRUD Operations

## Feature Overview
Implement full Create, Read, Update, and Delete operations for todos in the Todo App. This is the foundation of the product and must support optimistic UI updates, Singapore timezone handling for all date/time logic, and strong validation for inputs.

## User Stories
- As a user, I can create a todo with just a title so I can quickly capture tasks.
- As a user, I can optionally set a due date/time so I can track deadlines.
- As a user, I can edit a todo to fix mistakes or change details.
- As a user, I can mark a todo as complete to track progress.
- As a user, I can delete a todo with confirmation to avoid accidental loss.
- As a user, I can see todos grouped by status (Overdue, Pending, Completed) so I can prioritize work.

## User Flow
1. User logs in and lands on the main Todo page.
2. User types a title into the input field.
3. User optionally selects a priority (default Medium) and due date/time.
4. User clicks "Add".
5. Todo appears immediately (optimistic UI) in Overdue or Pending sections based on due date.
6. User can toggle completion by clicking the checkbox.
7. User can click "Edit" to modify title, due date, or priority.
8. User can click "Delete" and confirm to remove the todo.
9. Counters for Overdue/Pending/Completed update in real-time.

## Technical Requirements

### Database Schema
- Table: `todos`
- Required fields:
  - `id` (INTEGER PRIMARY KEY)
  - `title` (TEXT, required, trimmed)
  - `completed` (INTEGER/BOOLEAN, default false)
  - `due_date` (TEXT/ISO string, nullable)
  - `priority` (TEXT, default 'medium')
  - `created_at` (TEXT/ISO string)
  - `updated_at` (TEXT/ISO string)
- Additional fields may exist for later features (recurring, reminders, tags, etc.).

### API Endpoints
- `POST /api/todos`
  - Create a new todo.
  - Body: `{ title, dueDate?, priority? }`
  - Validates title and due date.
- `GET /api/todos`
  - Returns list of todos sorted by priority then due date.
- `GET /api/todos/[id]`
  - Returns a single todo by id.
- `PUT /api/todos/[id]`
  - Updates title, due date, priority, completed.
  - Validates title and due date.
- `DELETE /api/todos/[id]`
  - Deletes a todo (must cascade delete related data in later features).

### Timezone Handling
- All date/time logic uses Singapore timezone (Asia/Singapore).
- Due date validation must compare against Singapore "now".
- Minimum due date is 1 minute in the future.

### Validation Rules
- Title must be non-empty and trimmed.
- Due date must be in the future (>= now + 1 minute).
- If due date invalid: return error and do not create/update.

### Sorting and Grouping
- Todos grouped into sections:
  - Overdue: due_date < now and not completed.
  - Pending: due_date >= now or no due_date, and not completed.
  - Completed: completed = true.
- Sorting order within sections:
  1. Priority (high -> medium -> low)
  2. Due date (earliest first, nulls last)

## UI Components

### Main Form
- Text input: "Add a new todo..."
- Priority dropdown with default "Medium"
- Date-time picker
- "Add" button
- Location: top of main page

### Todo List Sections
- Overdue section highlighted with red background and warning icon.
- Pending section with neutral background.
- Completed section separated and visually muted.

### Todo Row
- Checkbox to toggle completed state
- Title text
- Priority badge
- Due date label (formatted, relative when appropriate)
- Edit button
- Delete button (requires confirmation)

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-32-38.png`
- `screenshots/Screenshot From 2026-02-06 13-33-07.png`
- `screenshots/Screenshot From 2026-02-06 13-33-19.png`

## Edge Cases
- Creating a todo with whitespace-only title -> error.
- Due date within 1 minute from now -> error.
- Editing a todo to past due date -> error.
- Deleting a todo with subtasks/tags (later features) must cascade.
- Switching completion state for overdue todo should move it to Completed.

## Acceptance Criteria
- Can create todo with just title.
- Can create todo with priority and due date.
- Todos are sorted by priority then due date.
- Completed todos move to Completed section immediately.
- Overdue todos show in Overdue section with red styling.
- Delete requires confirmation.
- Optimistic UI updates for create/edit/delete.

## Testing Requirements

### E2E Tests
- Create todo with title only.
- Create todo with due date in future.
- Attempt to create todo with past due date (validation error).
- Edit todo title and due date.
- Toggle completion.
- Delete todo with confirmation.

### Unit Tests
- Title validation (trim + non-empty).
- Due date validation with Singapore timezone.
- Sorting logic: priority then due date.

## Out of Scope
- Priority filtering (feature 02).
- Recurring todos (feature 03).
- Reminders, subtasks, tags, templates, export/import, calendar.

## Success Metrics
- Users can reliably create and manage todos without errors.
- CRUD operations complete within <200ms server time.
- UI updates feel instantaneous and consistent.
