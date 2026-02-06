# PRP 03: Recurring Todos

## Feature Overview
Enable recurring todos with daily, weekly, monthly, and yearly patterns. When a recurring todo is completed, the next instance should be created automatically with correct due date calculations in Singapore timezone and inherited metadata.

## User Stories
- As a user, I can create a recurring todo by selecting a repeat pattern.
- As a user, I must set a due date for recurring todos.
- As a user, completing a recurring todo automatically creates the next instance.
- As a user, the new instance keeps my chosen priority and reminder settings.
- As a user, I can disable recurrence on an existing todo.

## User Flow
1. User opens advanced options in the create form.
2. User checks "Repeat" and selects a pattern (daily/weekly/monthly/yearly).
3. User must set a due date.
4. Todo appears with a recurrence badge (🔄 pattern).
5. User completes the todo.
6. System creates a new todo with a due date advanced by the pattern.
7. The new instance appears in Pending with inherited metadata.

## Technical Requirements

### Database Schema
- Add fields to `todos`:
  - `is_recurring` (INTEGER/BOOLEAN, default false)
  - `recurrence_pattern` (TEXT, nullable)

### Type Definitions
- `type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'`

### Validation Rules
- If `is_recurring` is true, `due_date` must be present.
- `recurrence_pattern` must be one of the allowed values.

### Next Instance Creation
- Trigger: when a recurring todo is marked completed.
- New todo should inherit:
  - `title`
  - `priority`
  - `reminder_minutes`
  - `recurrence_pattern`
  - `is_recurring`
  - tags (if implemented)
- New todo should NOT inherit:
  - `completed` (must be false)
  - `created_at`/`updated_at` (new timestamps)

### Due Date Calculation
- Daily: +1 day
- Weekly: +7 days
- Monthly: same day next month (handle month length carefully)
- Yearly: same date next year
- All calculations must use Singapore timezone.

## UI Components

### Advanced Options in Form
- "Repeat" checkbox.
- Recurrence dropdown with daily/weekly/monthly/yearly.
- Disabled unless due date is set.

### Recurrence Badge
- Displayed on todo card: "🔄 daily", "🔄 weekly", etc.
- Consistent styling with other badges.

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-34-36.png`

## Edge Cases
- Due date missing when recurring enabled -> validation error.
- Completing a recurring todo without a due date -> should not happen (blocked earlier).
- Monthly recurrence on 31st should roll to last valid day of next month.
- Disabling recurring should remove recurrence badge and stop next instance creation.

## Acceptance Criteria
- All four recurrence patterns work correctly.
- Completing a recurring todo creates the next instance.
- New instance has correct due date.
- Metadata inherited properly.
- Recurring can be disabled on existing todo.

## Testing Requirements

### E2E Tests
- Create daily recurring todo.
- Create weekly recurring todo.
- Complete recurring todo and verify next instance created.
- Verify next instance due date accuracy.
- Verify next instance inherits priority/reminder.

### Unit Tests
- Due date calculations for daily/weekly/monthly/yearly.
- Validation rule: recurring requires due date.

## Out of Scope
- Notifications/reminders firing.
- Subtasks, tags, templates.
- Export/import and calendar.

## Success Metrics
- Recurring workflow reliable with no missed or duplicate instances.
- Date calculations correct for Singapore timezone.
