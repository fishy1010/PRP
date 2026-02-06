# PRP 03 - Recurring Todos

## Feature Overview
Enable recurring todos with daily, weekly, monthly, and yearly patterns. Completing a recurring todo automatically creates the next instance with inherited metadata and a correctly calculated due date in Asia/Singapore timezone.

## User Stories
- As a user, I can make a todo repeat on a schedule.
- As a user, I can complete a recurring todo and get the next one automatically.
- As a user, I can disable recurrence if I no longer need it.

## User Flow
1. User checks Repeat on the create/edit form.
2. User selects a recurrence pattern and sets a due date.
3. Todo displays a recurring badge with the pattern.
4. When the todo is completed, a new instance is created for the next occurrence.
5. User can edit and turn off recurrence later.

## Technical Requirements
- Types: recurrence pattern is one of daily, weekly, monthly, yearly.
- Database: fields for is_recurring and recurrence_pattern.
- Validation:
  - Recurring todos require a due date.
  - Invalid recurrence patterns are rejected.
- Next occurrence logic:
  - New todo created when a recurring todo is marked complete.
  - Inherit priority, tags, reminder, and recurrence settings.
  - Due date computed by adding the recurrence interval in Asia/Singapore.
- UI:
  - Repeat checkbox and recurrence pattern dropdown.
  - Recurring badge with pattern label.

## Edge Cases
- Missing due date on recurring todo should be rejected.
- End-of-month behavior for monthly recurrence.
- Recurring todo edited after creation; next instance should reflect current settings.
- Completed recurring todo should not duplicate creation.

## Acceptance Criteria
- All four recurrence patterns work.
- Completing a recurring todo creates the next instance.
- Metadata is inherited correctly.
- Due date calculations are accurate in Asia/Singapore timezone.
- User can disable recurring on existing todos.

## Testing Requirements
- E2E: create daily recurring todo.
- E2E: create weekly recurring todo.
- E2E: complete recurring todo creates next instance.
- E2E: next instance has correct due date.
- E2E: next instance inherits metadata.
- Unit: due date calculation for each pattern.

## Out of Scope
- Reminder notification delivery (handled in PRP 04).
- Template-based creation (handled in PRP 07).

## Success Metrics
- Recurring flows pass all tests without duplication.
- Date calculations match expected schedules in Singapore timezone.
