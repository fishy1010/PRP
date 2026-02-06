# PRP 02: Priority System

## Feature Overview
Add a three-level priority system (High, Medium, Low) to todos, with color-coded badges, sorting, and filtering. Priority should be visible everywhere a todo appears and must integrate with existing CRUD and list grouping.

## User Stories
- As a user, I can set priority when creating a todo.
- As a user, I can edit priority later.
- As a user, I can visually identify priority by color-coded badges.
- As a user, I can filter todos by priority.
- As a user, my todos automatically sort with high-priority tasks first.

## User Flow
1. User creates a todo and selects High/Medium/Low from dropdown.
2. Todo appears in list with matching badge color.
3. User uses "All Priorities" filter to view specific priority.
4. User edits a todo and changes priority.
5. List re-sorts immediately according to priority order.

## Technical Requirements

### Database Schema
- Add `priority` field to `todos` table if not already present.
- Allowed values: `high`, `medium`, `low`.
- Default: `medium`.

### Type Definitions
- `type Priority = 'high' | 'medium' | 'low'`

### API Validation
- Validate priority on create/update.
- Reject invalid values with 400 error.

### Sorting Rules
- Priority order: High -> Medium -> Low.
- Sorting applies within Overdue, Pending, Completed sections.

### UI Requirements
- Priority dropdown in create/edit forms.
- Priority badge next to todo title.
- Filter dropdown: "All Priorities", "High", "Medium", "Low".

### Color Codes
- High: Red badge
- Medium: Yellow badge
- Low: Blue badge
- Colors must meet WCAG AA contrast in light and dark mode.

## UI Components

### Priority Badge
- Visible next to todo title.
- Rounded pill, small font.
- Color-coded background and text.

### Priority Filter
- Dropdown near search bar.
- Defaults to "All Priorities".
- When selected, only shows matching priority todos.

### Screenshots Reference (UI Alignment)
- `screenshots/Screenshot From 2026-02-06 13-32-38.png`
- `screenshots/Screenshot From 2026-02-06 13-33-19.png`

## Edge Cases
- Todo without priority should default to Medium.
- Filtering when no todos match should show empty state.
- Changing priority should reorder immediately.

## Acceptance Criteria
- Three priority levels functional.
- Color-coded badges visible for each todo.
- Sorting by priority works across sections.
- Filter shows only selected priority.
- WCAG AA contrast compliance in light/dark modes.

## Testing Requirements

### E2E Tests
- Create todo with each priority level.
- Edit priority from Medium -> High.
- Filter by High/Medium/Low.
- Verify sorting order high -> medium -> low.

### Visual Tests
- Badge colors and contrast in light mode.
- Badge colors and contrast in dark mode.

## Out of Scope
- Recurring todos.
- Reminders.
- Tags and advanced filters beyond priority filter.

## Success Metrics
- Users consistently apply priorities.
- Sorting accuracy and filter reliability verified.
