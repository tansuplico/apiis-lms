import { getLocalDb } from "./localDb";
import { getLocalDateString } from "@/utils/dateformatter";

export async function queueCompletePart(
  courseId: number,
  moduleNumber: number,
  partSlug: string,
): Promise<void> {
  const db = await getLocalDb();
  await db.execute(
    `INSERT INTO local_pending_completions
       (course_id, module_number, part_slug, completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(course_id, module_number, part_slug) DO NOTHING`,
    [courseId, moduleNumber, partSlug, getLocalDateString()],
  );
}

export async function queueLastVisited(
  courseId: number,
  moduleNumber: number,
  partSlug: string,
): Promise<void> {
  const db = await getLocalDb();
  await db.execute(
    `INSERT INTO local_pending_last_visited
       (course_id, module_number, part_slug, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(course_id) DO UPDATE SET
       module_number = excluded.module_number,
       part_slug     = excluded.part_slug,
       updated_at    = excluded.updated_at`,
    [courseId, moduleNumber, partSlug, getLocalDateString()],
  );
}

export async function queueQuizAnswers(
  courseId: number,
  moduleNumber: number,
  answers: Record<string, number | string | boolean | string[]>,
): Promise<void> {
  const db = await getLocalDb();
  await db.execute(
    `INSERT INTO local_pending_quiz_answers
       (course_id, module_number, answers, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(course_id, module_number) DO UPDATE SET
       answers    = excluded.answers,
       updated_at = excluded.updated_at`,
    [courseId, moduleNumber, JSON.stringify(answers), getLocalDateString()],
  );
}

type PendingCompletion = {
  id: number;
  course_id: number;
  module_number: number;
  part_slug: string;
};

type PendingQuizAnswer = {
  course_id: number;
  module_number: number;
  answers: string;
};

type PendingLastVisited = {
  course_id: number;
  module_number: number;
  part_slug: string;
};

export async function syncPendingProgress(
  completePart: (
    courseId: number,
    moduleNumber: number,
    partSlug: string,
  ) => Promise<void>,
  updateLastVisited: (
    courseId: number,
    moduleNumber: number,
    partSlug: string,
  ) => Promise<void>,
): Promise<{ synced: number; failed: number }> {
  const db = await getLocalDb();

  const completions = await db.select<PendingCompletion[]>(
    `SELECT id, course_id, module_number, part_slug
     FROM local_pending_completions
     ORDER BY completed_at ASC`,
  );

  const lastVisited = await db.select<PendingLastVisited[]>(
    `SELECT course_id, module_number, part_slug
     FROM local_pending_last_visited`,
  );

  let synced = 0;
  let failed = 0;

  for (const row of completions) {
    try {
      await completePart(row.course_id, row.module_number, row.part_slug);
      await db.execute(`DELETE FROM local_pending_completions WHERE id = $1`, [
        row.id,
      ]);
      synced++;
    } catch {
      failed++;
    }
  }

  for (const row of lastVisited) {
    try {
      await updateLastVisited(row.course_id, row.module_number, row.part_slug);
      await db.execute(
        `DELETE FROM local_pending_last_visited WHERE course_id = $1`,
        [row.course_id],
      );
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function syncPendingQuizAnswers(
  saveQuizAnswers: (
    courseId: number,
    moduleNumber: number,
    answers: Record<string, number | string | boolean | string[]>,
  ) => Promise<{ coinsAwarded: number; alreadyClaimed: boolean }>,
): Promise<{ synced: number; failed: number; coinsAwarded: number }> {
  const db = await getLocalDb();

  const rows = await db.select<PendingQuizAnswer[]>(
    `SELECT course_id, module_number, answers
     FROM local_pending_quiz_answers
     ORDER BY updated_at ASC`,
  );

  let synced = 0;
  let failed = 0;
  let coinsAwarded = 0;

  for (const row of rows) {
    try {
      // Server still independently grades and computes coins from these
      // answers — this only replays what the student submitted, it never
      // trusts a client-computed coin amount.
      const result = await saveQuizAnswers(
        row.course_id,
        row.module_number,
        JSON.parse(row.answers),
      );
      coinsAwarded += result.coinsAwarded;
      await db.execute(
        `DELETE FROM local_pending_quiz_answers
         WHERE course_id = $1 AND module_number = $2`,
        [row.course_id, row.module_number],
      );
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed, coinsAwarded };
}

export async function hasPendingProgress(): Promise<boolean> {
  const db = await getLocalDb();
  const [c, v, q] = await Promise.all([
    db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM local_pending_completions`,
    ),
    db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM local_pending_last_visited`,
    ),
    db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM local_pending_quiz_answers`,
    ),
  ]);
  return (c[0]?.count ?? 0) + (v[0]?.count ?? 0) + (q[0]?.count ?? 0) > 0;
}
