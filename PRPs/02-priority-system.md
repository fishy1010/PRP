# PRP 02 - Priority System

## Feature Overview
Introduce a three-level priority system for todos with color-coded badges, sorting, and filtering.

## User Stories
- As a user, I can set priority when creating a todo.
- As a user, I can edit priority later.
- As a user, I can filter by priority to focus on urgent work.

## User Flow
1. User selects a priority on the create form (default: medium).
2. Todo displays a priority badge in list views.
3. User edits a todo and changes its priority.
4. User applies a priority filter to view only matching todos.

## Technical Requirements
- Type: priority is one of high, medium, low.
- Database: priority column on todos with default medium.
- Validation: reject any invalid priority values on create/update.
- Sorting: high before medium before low; then due date; then created time.
- Filtering: priority filter combines with other filters (search, tags).
- Styling: badge colors are visible in light/dark mode and meet contrast requirements.

## UI Components
- Priority dropdown in create form.
- Priority dropdown in edit form.
- Priority filter dropdown.
- Priority badge on todo items.

## Edge Cases
- Missing priority defaults to medium.
- Invalid priority values return validation errors.
- Filtering does not break sorting order.

## Acceptance Criteria
- Three priority levels available.
- Color-coded badges visible in all list sections.
- Automatic sorting by priority works.
- Filtering shows only selected priority.
- Badge colors are accessible in light and dark mode.

## Testing Requirements
- E2E: create todo with each priority.
- E2E: edit priority.
- E2E: filter by priority.
- E2E: verify sorting order (high, medium, low).
- Visual: badge colors in light/dark mode.

## Out of Scope
- Recurring behavior.
- Notifications/reminders.
- Tags and subtasks.

## Success Metrics
- Priority-related E2E tests pass.
- Sorting and filtering are deterministic and correct.
- No regressions to CRUD flows.
