# PRP 01 - Todo CRUD Operations

## Feature Overview
Implement full CRUD for todos with validation, Singapore timezone handling, and UI flows for creating, editing, completing, and deleting todos. Todos are grouped into Overdue, Active, and Completed, and sorted by priority and due date.

## User Stories
- As a user, I can create a todo with just a title so I can capture tasks quickly.
- As a user, I can set due dates and priority so I can manage urgency.
- As a user, I can edit or delete todos so my list stays accurate.
- As a user, I can mark a todo complete so I can track progress.

## User Flow
1. User enters a title, optionally selects priority and due date, and clicks Add.
2. Todo appears in Active list, sorted by priority and due date.
3. User marks a todo complete; it moves to Completed.
4. User edits a todo and saves; validation is enforced.
5. User deletes a todo after confirmation.
6. Overdue items appear in the Overdue section with warning styling.

## Technical Requirements
- Database schema includes a todos table with fields for title, completion, timestamps, due date, priority, and recurrence/reminder fields for later features.
- API endpoints for create, read-all, read-one, update, and delete.
- Validation rules:
  - Title is required, trimmed, non-empty.
  - Due date must be at least 1 minute in the future in Asia/Singapore.
- Sorting:
  - Priority order: high, then medium, then low.
  - Secondary sort by due date (earliest first), then created time.
- Timezone:
  - All date/time comparisons and formatting use Asia/Singapore.
- Deletes cascade to related subtasks and tag links.

## UI Components
- Create form: title input, priority dropdown, due date picker, Add button.
- Sections: Overdue, Active, Completed.
- Todo item: completion checkbox, edit action, delete action, metadata badges.
- Edit modal/form with the same validation rules as create.

## Edge Cases
- Title is whitespace only.
- Due date in the past or less than 1 minute from now.
- Missing due date is allowed for non-recurring todos.
- Editing a completed todo should preserve completion unless toggled.
- Deleting a todo removes related subtasks and tags.

## Acceptance Criteria
- Can create a todo with just a title.
- Can create a todo with priority and due date.
- Todos are sorted by priority and due date.
- Completed todos appear in Completed section.
- Overdue todos appear in Overdue section with warning UI.
- Delete cascades to subtasks and tags.

## Testing Requirements
- E2E: create todo with title only.
- E2E: create todo with all metadata.
- E2E: edit todo.
- E2E: toggle completion.
- E2E: delete todo.
- E2E: past due date validation.

## Out of Scope
- Recurring behavior (covered in PRP 03).
- Reminders/notifications (covered in PRP 04).
- Tags and subtasks (covered in PRP 05 and 06).

## Success Metrics
- CRUD flows pass all E2E tests.
- No regressions in validation for title and due dates.
- Users can complete the core todo lifecycle without errors.
