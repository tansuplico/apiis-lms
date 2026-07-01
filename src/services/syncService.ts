import { toBase64 } from "@/utils/imageUtils";
import { getLocalDb } from "./localDb";
import { Course } from "@/types/types";

type VideoDownloadProgress = {
  total: number;
  completed: number;
  failed: number;
  currentTitle: string | null;
};

const progressListeners: Array<(p: VideoDownloadProgress) => void> = [];

export function onVideoDownloadProgress(
  cb: (p: VideoDownloadProgress) => void,
): () => void {
  progressListeners.push(cb);
  return () => {
    const idx = progressListeners.indexOf(cb);
    if (idx !== -1) progressListeners.splice(idx, 1);
  };
}

export async function syncCoursesToLocal(courses: Course[]): Promise<void> {
  const db = await getLocalDb();

  // ── Remove local courses that no longer exist on the server
  const incomingIds = courses.map((c) => c.id);
  const existingRows = await db.select<{ id: number }[]>(
    `SELECT id FROM local_courses`,
  );
  const staleIds = existingRows
    .map((r) => r.id)
    .filter((id) => !incomingIds.includes(id));

  for (const staleId of staleIds) {
    await db.execute(`DELETE FROM local_quiz_questions WHERE course_id = $1`, [
      staleId,
    ]);
    await db.execute(`DELETE FROM local_parts WHERE course_id = $1`, [staleId]);
    await db.execute(
      `DELETE FROM local_module_videos WHERE module_id IN (SELECT id FROM local_modules WHERE course_id = $1)`,
      [staleId],
    );
    await db.execute(`DELETE FROM local_modules WHERE course_id = $1`, [
      staleId,
    ]);
    await db.execute(`DELETE FROM local_courses WHERE id = $1`, [staleId]);
  }

  for (const course of courses) {
    let localThumbnail = course.thumbnailUrl ?? null;
    if (localThumbnail && !localThumbnail.startsWith("data:")) {
      const base = (import.meta.env.VITE_API_URL as string).replace(
        /\/api$/,
        "",
      );
      const fullUrl = localThumbnail.startsWith("http")
        ? localThumbnail
        : `${base}${localThumbnail}`;
      const base64 = await toBase64(fullUrl);
      if (base64) localThumbnail = base64;
    }

    await db.execute(
      `INSERT INTO local_courses
        (id, title, category, description, level, level_color, bg_color, thumbnail_url, subtitle, instructor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, category=excluded.category,
        description=excluded.description, level=excluded.level,
        level_color=excluded.level_color, bg_color=excluded.bg_color,
        thumbnail_url=excluded.thumbnail_url, subtitle=excluded.subtitle,
        instructor=excluded.instructor`,
      [
        course.id,
        course.title,
        course.category,
        course.description,
        course.level,
        course.levelColor,
        course.bgColor,
        localThumbnail,
        course.subtitle ?? null,
        course.instructor ?? null,
      ],
    );

    for (const module of course.modules ?? []) {
      await db.execute(
        `INSERT INTO local_modules (id, course_id, number, title, weight, total_reward_coins)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT(id) DO UPDATE SET
          title=excluded.title, weight=excluded.weight,
          total_reward_coins=excluded.total_reward_coins`,
        [
          module.id,
          course.id,
          module.number,
          module.title,
          module.weight ?? null,
          module.totalRewardCoins ?? null,
        ],
      );

      for (const part of module.parts ?? []) {
        await db.execute(
          `INSERT INTO local_parts (id, module_id, course_id, slug, name, cover_color, content, order_num)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, cover_color=excluded.cover_color,
            content=excluded.content, order_num=excluded.order_num`,
          [
            part.id,
            module.id,
            course.id,
            part.slug,
            part.name,
            part.coverColor,
            part.content ?? null,
            part.order,
          ],
        );

        for (const [index, q] of (part.quizQuestions ?? []).entries()) {
          await db.execute(
            `INSERT INTO local_quiz_questions
              (id, part_id, module_id, course_id, type, question, options,
               correct_option_index, correct_answer, explanation, order_num)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT(id) DO UPDATE SET
              question=excluded.question, options=excluded.options,
              correct_option_index=excluded.correct_option_index,
              correct_answer=excluded.correct_answer,
              explanation=excluded.explanation`,
            [
              q.id,
              part.id,
              module.id,
              course.id,
              q.type,
              q.question,
              q.options ? JSON.stringify(q.options) : null,
              q.correctOptionIndex ?? null,
              q.correctAnswer ?? null,
              q.explanation ?? null,
              index,
            ],
          );
        }
      }
    }
  }

  await db.execute(
    `INSERT INTO local_sync_meta (key, value) VALUES ('last_sync', $1)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [new Date().toISOString()],
  );
}

export async function getLocalCourses(): Promise<Course[]> {
  const db = await getLocalDb();

  const courses = await db.select<any[]>(`SELECT * FROM local_courses`);
  const modules = await db.select<any[]>(
    `SELECT * FROM local_modules ORDER BY number ASC`,
  );
  const parts = await db.select<any[]>(
    `SELECT * FROM local_parts ORDER BY order_num ASC`,
  );
  const quizQuestions = await db.select<any[]>(
    `SELECT * FROM local_quiz_questions ORDER BY order_num ASC`,
  );
  const videos = await db.select<any[]>(
    `SELECT * FROM local_module_videos ORDER BY sort_order ASC`,
  );

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    description: c.description,
    level: c.level,
    levelColor: c.level_color,
    bgColor: c.bg_color,
    thumbnailUrl: c.thumbnail_url,
    subtitle: c.subtitle,
    instructor: c.instructor,
    modules: modules
      .filter((m) => m.course_id === c.id)
      .map((m) => ({
        id: m.id,
        number: m.number,
        title: m.title,
        weight: m.weight,
        totalRewardCoins: m.total_reward_coins,
        parts: parts
          .filter((p) => p.module_id === m.id)
          .map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            coverColor: p.cover_color,
            content: p.content,
            order: p.order_num,
            quizQuestions: quizQuestions
              .filter((q) => q.part_id === p.id)
              .map((q) => ({
                id: q.id,
                type: q.type,
                question: q.question,
                options: q.options ? JSON.parse(q.options) : null,
                correctOptionIndex: q.correct_option_index,
                correctAnswer: q.correct_answer,
                explanation: q.explanation,
              })),
          })),
        videos: videos
          .filter((v) => v.module_id === m.id)
          .map((v) => ({
            id: v.id,
            moduleId: v.module_id,
            title: v.title,
            filename: v.filename,
            durationSeconds: v.duration_seconds,
            sortOrder: v.sort_order,
            localPath: v.local_path,
            downloaded: v.downloaded === 1,
          })),
      })),
  }));
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = await getLocalDb();
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM local_sync_meta WHERE key = 'last_sync'`,
  );
  return rows[0]?.value ?? null;
}
