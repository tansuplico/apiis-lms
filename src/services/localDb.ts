import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getLocalDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load("sqlite:apiis_lms.db");
  await initSchema(db);
  return db;
}

async function initSchema(d: Database): Promise<void> {
  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_courses (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      description TEXT,
      level TEXT,
      level_color TEXT,
      bg_color TEXT,
      thumbnail_url TEXT,
      subtitle TEXT,
      instructor TEXT
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_modules (
      id INTEGER PRIMARY KEY,
      course_id INTEGER NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      weight REAL,
      total_reward_coins INTEGER
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_parts (
      id INTEGER PRIMARY KEY,
      module_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      cover_color TEXT,
      content TEXT,
      order_num INTEGER
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_quiz_questions (
      id INTEGER PRIMARY KEY,
      part_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      correct_option_index INTEGER,
      correct_answer TEXT,
      correct_answers TEXT,
      correct_boolean INTEGER,
      matching_pairs TEXT,
      image_url TEXT,
      explanation TEXT,
      order_num INTEGER
    )
  `);

  const existingColumns = await d.select<{ name: string }[]>(
    `PRAGMA table_info(local_quiz_questions)`,
  );
  const columnNames = new Set(existingColumns.map((c) => c.name));
  const newColumns: [string, string][] = [
    ["correct_answers", "TEXT"],
    ["correct_boolean", "INTEGER"],
    ["matching_pairs", "TEXT"],
    ["image_url", "TEXT"],
  ];
  for (const [name, ddlType] of newColumns) {
    if (!columnNames.has(name)) {
      await d.execute(
        `ALTER TABLE local_quiz_questions ADD COLUMN ${name} ${ddlType}`,
      );
    }
  }

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_student (
      id INTEGER PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      coins INTEGER,
      profile_picture TEXT,
      cover_color TEXT
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_pending_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    module_number INTEGER NOT NULL,
    part_slug TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    UNIQUE(course_id, module_number, part_slug)
  )
`);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_pending_last_visited (
    course_id INTEGER PRIMARY KEY,
    module_number INTEGER NOT NULL,
    part_slug TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

  await d.execute(`
    CREATE TABLE IF NOT EXISTS local_pending_quiz_answers (
    course_id INTEGER NOT NULL,
    module_number INTEGER NOT NULL,
    answers TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (course_id, module_number)
  )
`);
}
