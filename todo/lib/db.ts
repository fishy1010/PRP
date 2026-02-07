import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDatabase() {
  // Create users table (used by tags and future auth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create authenticators table
  db.exec(`
    CREATE TABLE IF NOT EXISTS authenticators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credential_id TEXT NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER DEFAULT 0,
      transports TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, credential_id)
    )
  `);

  // Create todos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      due_date TEXT,
      priority TEXT DEFAULT 'medium',
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      reminder_minutes INTEGER,
      last_notification_sent TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create subtasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
    )
  `);

  // Create tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create todo_tags join table
  db.exec(`
    CREATE TABLE IF NOT EXISTS todo_tags (
      todo_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (todo_id, tag_id),
      FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Create templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      title_template TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      reminder_minutes INTEGER,
      subtasks_json TEXT,
      due_date_offset_days INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create holidays table
  db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(date, name)
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
    CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);
    CREATE INDEX IF NOT EXISTS idx_subtasks_position ON subtasks(todo_id, position);
    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
    CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
    CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
    CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
    CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);
    CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
  `);

  // Seed Singapore public holidays
  const holidayCount = db.prepare('SELECT COUNT(*) as count FROM holidays').get() as { count: number };
  if (holidayCount.count === 0) {
    const insertHoliday = db.prepare('INSERT OR IGNORE INTO holidays (date, name) VALUES (?, ?)');
    const seedHolidays = db.transaction((holidays: [string, string][]) => {
      for (const [date, name] of holidays) {
        insertHoliday.run(date, name);
      }
    });

    seedHolidays([
      // 2025 Singapore Public Holidays
      ['2025-01-01', "New Year's Day"],
      ['2025-01-29', 'Chinese New Year'],
      ['2025-01-30', 'Chinese New Year'],
      ['2025-03-31', 'Hari Raya Puasa'],
      ['2025-04-18', 'Good Friday'],
      ['2025-05-01', 'Labour Day'],
      ['2025-05-12', 'Vesak Day'],
      ['2025-06-07', 'Hari Raya Haji'],
      ['2025-08-09', 'National Day'],
      ['2025-10-20', 'Deepavali'],
      ['2025-12-25', 'Christmas Day'],
      // 2026 Singapore Public Holidays
      ['2026-01-01', "New Year's Day"],
      ['2026-02-17', 'Chinese New Year'],
      ['2026-02-18', 'Chinese New Year'],
      ['2026-03-20', 'Hari Raya Puasa'],
      ['2026-04-03', 'Good Friday'],
      ['2026-05-01', 'Labour Day'],
      ['2026-05-24', 'Vesak Day'],
      ['2026-06-07', 'Hari Raya Haji'],
      ['2026-08-09', 'National Day'],
      ['2026-10-18', 'Deepavali'],
      ['2026-12-25', 'Christmas Day'],
      // 2027 Singapore Public Holidays
      ['2027-01-01', "New Year's Day"],
      ['2027-02-06', 'Chinese New Year'],
      ['2027-02-07', 'Chinese New Year'],
      ['2027-03-10', 'Hari Raya Puasa'],
      ['2027-03-26', 'Good Friday'],
      ['2027-05-01', 'Labour Day'],
      ['2027-05-13', 'Vesak Day'],
      ['2027-05-27', 'Hari Raya Haji'],
      ['2027-08-09', 'National Day'],
      ['2027-11-07', 'Deepavali'],
      ['2027-12-25', 'Christmas Day'],
    ]);
  }

  const defaultUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!defaultUser) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (username, created_at, updated_at)
      VALUES (?, ?, ?)
    `).run('default', now, now);
  }
}

// Initialize the database
initDatabase();

export default db;
