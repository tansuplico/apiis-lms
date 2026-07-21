// src/controllers/studentController.ts
import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/auth";

// ── Constants
const SLUG_REGEX = /^[a-z0-9-]+$/;
const MAX_ANSWERS_COUNT = 50; // ← match MAX_QUIZ_QUESTIONS from courseController

// ── Quiz grading (shared by saveQuizAnswers and the gradebook batch query below —
// keep both call sites in sync when adding a new question type)
function isAnswerCorrect(qd: any, studentAns: unknown): boolean {
  const type = qd.type ?? "multiple_choice";

  switch (type) {
    case "multiple_choice":
      return studentAns === qd.correctOptionIndex;

    case "true_false": {
      if (typeof studentAns === "undefined") return false;
      const normalized =
        typeof studentAns === "string"
          ? studentAns.trim().toLowerCase() === "true"
          : Boolean(studentAns);
      return normalized === qd.correctBoolean;
    }

    case "identification": {
      if (typeof studentAns !== "string") return false;
      // Backward-compatible: old rows may still only have a single `correctAnswer`.
      const accepted: string[] = Array.isArray(qd.correctAnswers)
        ? qd.correctAnswers
        : qd.correctAnswer
          ? [qd.correctAnswer]
          : [];
      const normalizedAns = studentAns.trim().toLowerCase();
      return accepted.some(
        (a) =>
          typeof a === "string" && a.trim().toLowerCase() === normalizedAns,
      );
    }

    case "matching": {
      if (!Array.isArray(studentAns) || !Array.isArray(qd.matchingPairs)) {
        return false;
      }
      if (studentAns.length !== qd.matchingPairs.length) return false;
      // All-or-nothing per question, consistent with every other question type
      // here being graded as a single correct/incorrect unit (no partial credit).
      return qd.matchingPairs.every(
        (pair: { left: string; right: string }, i: number) =>
          typeof studentAns[i] === "string" &&
          (studentAns[i] as string).trim().toLowerCase() ===
            pair.right.trim().toLowerCase(),
      );
    }

    case "fill_in_the_blank":
    default:
      return (
        typeof studentAns === "string" &&
        studentAns.trim().toLowerCase() ===
          qd.correctAnswer?.trim().toLowerCase()
      );
  }
}

interface GradebookModule {
  id: number;
  number: number;
  title: string;
  weight: number | null;
}

interface StudentAnswerRow {
  module_number: number;
  answers: Record<string, unknown>;
  coins_awarded: number | null;
  submitted_at: unknown;
}

async function batchFetchQuizData(moduleIds: number[]) {
  const allQuizParts = await pool.query(
    `SELECT id, module_id FROM course_parts
   WHERE module_id = ANY($1) AND slug = 'quiz'`,
    [moduleIds],
  );

  // Map module_id → quiz part id for O(1) lookup in loop
  const quizPartByModuleId = new Map<number, number>(
    allQuizParts.rows.map((p) => [p.module_id, p.id]),
  );

  const quizPartIds = allQuizParts.rows.map((p) => p.id);

  const allQuestions =
    quizPartIds.length > 0
      ? await pool.query(
          `SELECT id, part_id, question_data FROM quiz_questions
       WHERE part_id = ANY($1) ORDER BY id ASC`,
          [quizPartIds],
        )
      : { rows: [] };

  // Map part_id → questions array for O(1) lookup in loop
  const questionsByPartId = new Map<number, any[]>();
  for (const q of allQuestions.rows) {
    if (!questionsByPartId.has(q.part_id)) {
      questionsByPartId.set(q.part_id, []);
    }
    questionsByPartId.get(q.part_id)!.push(q);
  }

  return { quizPartByModuleId, questionsByPartId };
}

function buildStudentGradebook(
  modules: GradebookModule[],
  quizPartByModuleId: Map<number, number>,
  questionsByPartId: Map<number, any[]>,
  studentAnswerRows: StudentAnswerRow[],
) {
  const gradebook = [];
  let totalQuestions = 0;
  let totalCorrect = 0;

  for (const module of modules) {
    const quizPartId = quizPartByModuleId.get(module.id);

    if (!quizPartId) {
      gradebook.push({
        moduleNumber: module.number,
        moduleTitle: module.title,
        moduleWeight: module.weight ?? null,
        hasQuiz: false,
        attempted: false,
        totalQuestions: 0,
        correctAnswers: 0,
        score: null,
        passed: null,
        coinsAwarded: 0,
        submittedAt: null,
      });
      continue;
    }

    const questions = questionsByPartId.get(quizPartId) ?? [];
    const numQuestions = questions.length;

    if (numQuestions === 0) {
      gradebook.push({
        moduleNumber: module.number,
        moduleTitle: module.title,
        moduleWeight: module.weight ?? null,
        hasQuiz: false,
        attempted: false,
        totalQuestions: 0,
        correctAnswers: 0,
        score: null,
        passed: null,
        coinsAwarded: 0,
        submittedAt: null,
      });
      continue;
    }

    const studentAnswer = studentAnswerRows.find(
      (a) => a.module_number === module.number,
    );

    if (!studentAnswer) {
      gradebook.push({
        moduleNumber: module.number,
        moduleTitle: module.title,
        moduleWeight: module.weight ?? null,
        hasQuiz: true,
        attempted: false,
        totalQuestions: numQuestions,
        correctAnswers: 0,
        score: 0,
        passed: false,
        coinsAwarded: 0,
        submittedAt: null,
      });
      totalQuestions += numQuestions;
      continue;
    }

    const studentAnswers = studentAnswer.answers;
    let correct = 0;

    questions.forEach((q) => {
      const qd = q.question_data;
      const studentAns = studentAnswers[String(q.id)];
      if (isAnswerCorrect(qd, studentAns)) correct++;
    });

    const score = Math.round((correct / numQuestions) * 100);
    const passed = score >= 75;

    totalQuestions += numQuestions;
    totalCorrect += correct;

    gradebook.push({
      moduleNumber: module.number,
      moduleTitle: module.title,
      moduleWeight: module.weight ?? null,
      hasQuiz: true,
      attempted: true,
      totalQuestions: numQuestions,
      correctAnswers: correct,
      score,
      passed,
      coinsAwarded: studentAnswer.coins_awarded ?? 0,
      submittedAt: studentAnswer.submitted_at ?? null,
    });
  }

  // Calculate weighted overall score
  const attemptedModules = gradebook.filter((m) => m.hasQuiz && m.attempted);

  let weightedScore = 0;

  if (attemptedModules.length > 0) {
    const explicitWeightModules = gradebook.filter(
      (m) => m.moduleWeight !== null,
    );
    const nullWeightModules = gradebook.filter(
      (m) => m.moduleWeight === null && m.hasQuiz,
    );

    const explicitWeightSum = explicitWeightModules.reduce(
      (sum, m) => sum + (m.moduleWeight ?? 0),
      0,
    );
    const remainingWeight = 100 - explicitWeightSum;
    const equalShare =
      nullWeightModules.length > 0
        ? remainingWeight / nullWeightModules.length
        : 0;

    const effectiveWeights: Record<number, number> = {};
    for (const m of gradebook) {
      if (m.moduleWeight !== null) {
        effectiveWeights[m.moduleNumber] = m.moduleWeight;
      } else if (m.hasQuiz) {
        effectiveWeights[m.moduleNumber] = equalShare;
      } else {
        effectiveWeights[m.moduleNumber] = 0;
      }
    }

    const attemptedWeightSum = attemptedModules.reduce(
      (sum, m) => sum + (effectiveWeights[m.moduleNumber] ?? 0),
      0,
    );

    if (attemptedWeightSum > 0) {
      weightedScore = attemptedModules.reduce((sum, m) => {
        const w = effectiveWeights[m.moduleNumber] ?? 0;
        return sum + ((m.score ?? 0) / 100) * w;
      }, 0);

      weightedScore = (weightedScore / attemptedWeightSum) * 100;
    }

    for (const entry of gradebook) {
      (entry as any).effectiveWeight =
        effectiveWeights[entry.moduleNumber] ?? 0;
    }
  }

  const overallScore = Math.round(weightedScore);

  return {
    modules: gradebook,
    overallScore,
    overallPassed: overallScore >= 75,
    totalQuestions,
    totalCorrect,
  };
}

// ── Get Student Progress
export const getStudentProgress = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;

    const studentId = req.params.studentId
      ? Number(req.params.studentId)
      : requesterId;

    if (isNaN(studentId)) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }

    if (requesterRole === "student" && studentId !== requesterId) {
      res.status(403).json({
        success: false,
        message: "You can only view your own progress.",
      });
      return;
    }

    if (requesterRole === "facilitator") {
      const inCenter = await pool.query(
        `SELECT sc.student_id
         FROM student_centers sc
         INNER JOIN center_facilitators cf ON cf.center_id = sc.center_id
         WHERE cf.facilitator_id = $1 AND sc.student_id = $2 AND sc.is_current = TRUE`,
        [requesterId, studentId],
      );
      if (inCenter.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You can only view progress of students in your centers.",
        });
        return;
      }
    }

    const student = await pool.query(`SELECT id FROM students WHERE id = $1`, [
      studentId,
    ]);

    if (student.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    const progressResult = await pool.query(
      `SELECT scp.course_id, scp.last_visited_module,
              scp.last_visited_part, scp.updated_at
       FROM student_course_progress scp
       WHERE scp.student_id = $1`,
      [studentId],
    );

    const completedPartsResult = await pool.query(
      `SELECT course_id, module_number, part_slug, completed_at
       FROM student_completed_parts
       WHERE student_id = $1`,
      [studentId],
    );

    const quizAnswersResult = await pool.query(
      `SELECT course_id, module_number, answers
       FROM student_quiz_answers
       WHERE student_id = $1`,
      [studentId],
    );

    const accessoriesResult = await pool.query(
      `SELECT accessory_id FROM student_accessories WHERE student_id = $1`,
      [studentId],
    );

    const coinsResult = await pool.query(
      `SELECT coins FROM students WHERE id = $1`,
      [studentId],
    );

    const courseProgress: Record<number, any> = {};

    for (const row of progressResult.rows) {
      const completedParts = completedPartsResult.rows
        .filter((cp) => cp.course_id === row.course_id)
        .map((cp) => `${cp.module_number}:${cp.part_slug}`);

      const quizAnswers: Record<number, Record<string, number>> = {};
      for (const qa of quizAnswersResult.rows.filter(
        (qa) => qa.course_id === row.course_id,
      )) {
        quizAnswers[qa.module_number] = qa.answers;
      }

      courseProgress[row.course_id] = {
        courseId: row.course_id,
        completedParts,
        lastVisitedModule: row.last_visited_module,
        lastVisitedPart: row.last_visited_part,
        quizAnswers,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        coins: coinsResult.rows[0]?.coins ?? 0,
        courseProgress,
        accessoriesOwned: accessoriesResult.rows.map((a) => a.accessory_id),
      },
    });
  } catch (err) {
    console.error("getStudentProgress error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Course Progress
export const getCourseProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user!.id;

    if (isNaN(Number(courseId))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }

    const progressResult = await pool.query(
      `SELECT scp.course_id, scp.last_visited_module, scp.last_visited_part
       FROM student_course_progress scp
       WHERE scp.student_id = $1 AND scp.course_id = $2`,
      [studentId, courseId],
    );

    if (progressResult.rows.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          courseId: Number(courseId),
          completedParts: [],
          lastVisitedModule: 1,
          lastVisitedPart: "introduction",
          quizAnswers: {},
        },
      });
      return;
    }

    const progress = progressResult.rows[0];

    const completedPartsResult = await pool.query(
      `SELECT module_number, part_slug
       FROM student_completed_parts
       WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId],
    );

    const quizAnswersResult = await pool.query(
      `SELECT module_number, answers
       FROM student_quiz_answers
       WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId],
    );

    const quizAnswers: Record<number, Record<string, number>> = {};
    for (const qa of quizAnswersResult.rows) {
      quizAnswers[qa.module_number] = qa.answers;
    }

    res.status(200).json({
      success: true,
      data: {
        courseId: Number(courseId),
        completedParts: completedPartsResult.rows.map(
          (cp) => `${cp.module_number}:${cp.part_slug}`,
        ),
        lastVisitedModule: progress.last_visited_module,
        lastVisitedPart: progress.last_visited_part,
        quizAnswers,
      },
    });
  } catch (err) {
    console.error("getCourseProgress error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Complete a Part
export const completePart = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { courseId, moduleNumber, partSlug } = req.body;

    if (!courseId || !moduleNumber || !partSlug) {
      res.status(400).json({
        success: false,
        message: "courseId, moduleNumber, and partSlug are required.",
      });
      return;
    }

    if (isNaN(Number(courseId))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }
    if (isNaN(Number(moduleNumber)) || Number(moduleNumber) < 1) {
      res
        .status(400)
        .json({ success: false, message: "Invalid module number." });
      return;
    }

    if (!SLUG_REGEX.test(partSlug)) {
      res.status(400).json({ success: false, message: "Invalid part slug." });
      return;
    }

    const course = await pool.query(`SELECT id FROM courses WHERE id = $1`, [
      courseId,
    ]);
    if (course.rows.length === 0) {
      res.status(404).json({ success: false, message: "Course not found." });
      return;
    }

    const part = await pool.query(
      `SELECT cp.id FROM course_parts cp
       INNER JOIN course_modules cm ON cm.id = cp.module_id
       WHERE cm.course_id = $1 AND cm.number = $2 AND cp.slug = $3`,
      [courseId, moduleNumber, partSlug],
    );
    if (part.rows.length === 0) {
      res.status(404).json({ success: false, message: "Part not found." });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO student_course_progress
          (student_id, course_id, last_visited_module, last_visited_part)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, course_id)
         DO UPDATE SET
           last_visited_module = $3,
           last_visited_part = $4,
           updated_at = NOW()`,
        [studentId, courseId, moduleNumber, partSlug],
      );

      await client.query(
        `INSERT INTO student_completed_parts
          (student_id, course_id, module_number, part_slug)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, course_id, module_number, part_slug)
         DO NOTHING`,
        [studentId, courseId, moduleNumber, partSlug],
      );

      await client.query("COMMIT");

      res
        .status(200)
        .json({ success: true, message: "Part marked as completed." });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("completePart error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Update Last Visited
export const updateLastVisited = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { courseId, moduleNumber, partSlug } = req.body;

    if (!courseId || !moduleNumber || !partSlug) {
      res.status(400).json({
        success: false,
        message: "courseId, moduleNumber, and partSlug are required.",
      });
      return;
    }

    if (isNaN(Number(courseId))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }
    if (isNaN(Number(moduleNumber)) || Number(moduleNumber) < 1) {
      res
        .status(400)
        .json({ success: false, message: "Invalid module number." });
      return;
    }
    if (!SLUG_REGEX.test(partSlug)) {
      res.status(400).json({ success: false, message: "Invalid part slug." });
      return;
    }

    await pool.query(
      `INSERT INTO student_course_progress
        (student_id, course_id, last_visited_module, last_visited_part)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, course_id)
       DO UPDATE SET
         last_visited_module = $3,
         last_visited_part = $4,
         updated_at = NOW()`,
      [studentId, courseId, moduleNumber, partSlug],
    );

    res.status(200).json({ success: true, message: "Last visited updated." });
  } catch (err) {
    console.error("updateLastVisited error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Save Quiz Answers + Claim Coins
export const saveQuizAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { courseId, moduleNumber, answers } = req.body;

    if (!courseId || !moduleNumber || !answers) {
      res.status(400).json({
        success: false,
        message: "courseId, moduleNumber, and answers are required.",
      });
      return;
    }

    if (isNaN(Number(courseId))) {
      res.status(400).json({ success: false, message: "Invalid course ID." });
      return;
    }

    if (isNaN(Number(moduleNumber)) || Number(moduleNumber) < 1) {
      res
        .status(400)
        .json({ success: false, message: "Invalid module number." });
      return;
    }
    if (typeof answers !== "object" || Array.isArray(answers)) {
      res
        .status(400)
        .json({ success: false, message: "Answers must be an object." });
      return;
    }
    if (Object.keys(answers).length > MAX_ANSWERS_COUNT) {
      res.status(400).json({ success: false, message: "Too many answers." });
      return;
    }

    for (const [key, value] of Object.entries(answers)) {
      if (isNaN(Number(key))) {
        res
          .status(400)
          .json({ success: false, message: "Invalid answer key." });
        return;
      }
      if (typeof value === "number") {
        if (value < 0 || !Number.isInteger(value)) {
          res
            .status(400)
            .json({ success: false, message: "Invalid answer format." });
          return;
        }
      } else if (typeof value === "string") {
        if (value.length > 500) {
          res
            .status(400)
            .json({ success: false, message: "Answer text is too long." });
          return;
        }
      } else {
        res
          .status(400)
          .json({ success: false, message: "Invalid answer format." });
        return;
      }
    }

    const module = await pool.query(
      `SELECT cm.id FROM course_modules cm WHERE cm.course_id = $1 AND cm.number = $2`,
      [courseId, moduleNumber],
    );
    if (module.rows.length === 0) {
      res.status(404).json({ success: false, message: "Module not found." });
      return;
    }

    const quizPartResult = await pool.query(
      `SELECT cp.id FROM course_parts cp
   WHERE cp.module_id = $1 AND cp.slug = 'quiz'`,
      [module.rows[0].id],
    );

    let coinsToAward = 0;

    if (quizPartResult.rows.length > 0) {
      const questionsResult = await pool.query(
        `SELECT id, question_data FROM quiz_questions
     WHERE part_id = $1 ORDER BY id ASC`,
        [quizPartResult.rows[0].id],
      );

      const courseResult = await pool.query(
        `SELECT level FROM courses WHERE id = $1`,
        [courseId],
      );

      const COIN_REWARDS_BY_DIFFICULTY: Record<string, number> = {
        Beginner: 5,
        Moderate: 10,
        Intermediate: 20,
        Advanced: 30,
        Expert: 50,
        "All Levels": 15,
      };

      const level = courseResult.rows[0]?.level ?? "Beginner";
      const difficultyCoins = COIN_REWARDS_BY_DIFFICULTY[level] ?? 5;

      const questions = questionsResult.rows;
      let correct = 0;

      questions.forEach((q) => {
        const qd = q.question_data;
        const studentAns = answers[String(q.id)];
        if (isAnswerCorrect(qd, studentAns)) correct++;
      });

      coinsToAward =
        questions.length > 0
          ? Math.round((correct / questions.length) * difficultyCoins)
          : 0;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT id, coins_awarded FROM student_quiz_answers
         WHERE student_id = $1 AND course_id = $2 AND module_number = $3`,
        [studentId, courseId, moduleNumber],
      );

      const alreadyClaimed =
        existing.rows.length > 0 && existing.rows[0].coins_awarded > 0;

      await client.query(
        `INSERT INTO student_quiz_answers
          (student_id, course_id, module_number, answers, coins_awarded)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, course_id, module_number)
         DO UPDATE SET
           answers = $4,
           coins_awarded = CASE
             WHEN student_quiz_answers.coins_awarded > 0
             THEN student_quiz_answers.coins_awarded
             ELSE $5
           END`,
        [
          studentId,
          courseId,
          moduleNumber,
          JSON.stringify(answers),
          alreadyClaimed ? 0 : coinsToAward,
        ],
      );

      let coinsAwarded = 0;
      if (!alreadyClaimed && coinsToAward > 0) {
        await client.query(
          `UPDATE students SET coins = coins + $1, updated_at = NOW() WHERE id = $2`,
          [coinsToAward, studentId],
        );
        coinsAwarded = coinsToAward;
      }

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        message: alreadyClaimed
          ? "Quiz answers saved. Coins already claimed for this module."
          : `Quiz answers saved. ${coinsAwarded} coins awarded.`,
        data: { coinsAwarded, alreadyClaimed },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("saveQuizAnswers error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Purchase Accessory
export const purchaseAccessory = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { accessoryId } = req.body;

    if (!accessoryId) {
      res.status(400).json({
        success: false,
        message: "accessoryId is required.",
      });
      return;
    }

    if (isNaN(Number(accessoryId))) {
      res
        .status(400)
        .json({ success: false, message: "Invalid accessory ID." });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const accessoryResult = await client.query(
        `SELECT id, price FROM shop_items WHERE id = $1`,
        [accessoryId],
      );

      if (accessoryResult.rows.length === 0) {
        await client.query("ROLLBACK");
        res
          .status(404)
          .json({ success: false, message: "Accessory not found." });
        return;
      }

      const price = accessoryResult.rows[0].price;

      const alreadyOwned = await client.query(
        `SELECT id FROM student_accessories
         WHERE student_id = $1 AND accessory_id = $2`,
        [studentId, accessoryId],
      );

      if (alreadyOwned.rows.length > 0) {
        await client.query("ROLLBACK");
        res
          .status(409)
          .json({ success: false, message: "Accessory already owned." });
        return;
      }

      const studentResult = await client.query(
        `SELECT coins FROM students WHERE id = $1`,
        [studentId],
      );

      const coins = studentResult.rows[0]?.coins ?? 0;

      if (coins < price) {
        await client.query("ROLLBACK");
        res.status(400).json({
          success: false,
          message: "Not enough coins.",
          data: { currentCoins: coins, required: price },
        });
        return;
      }

      await client.query(
        `UPDATE students SET coins = coins - $1, updated_at = NOW() WHERE id = $2`,
        [price, studentId],
      );

      await client.query(
        `INSERT INTO student_accessories (student_id, accessory_id) VALUES ($1, $2)`,
        [studentId, accessoryId],
      );

      await client.query("COMMIT");

      const updatedStudent = await pool.query(
        `SELECT coins FROM students WHERE id = $1`,
        [studentId],
      );

      res.status(200).json({
        success: true,
        message: "Accessory purchased successfully.",
        data: {
          accessoryId,
          remainingCoins: updatedStudent.rows[0].coins,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("purchaseAccessory error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Gradebook for a Student
export const getStudentGradebook = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { courseId } = req.query;

    if (isNaN(Number(studentId))) {
      res.status(400).json({ success: false, message: "Invalid student ID." });
      return;
    }
    if (!courseId || isNaN(Number(courseId))) {
      res
        .status(400)
        .json({ success: false, message: "Valid courseId is required." });
      return;
    }

    if (req.user!.role === "facilitator") {
      const inCenter = await pool.query(
        `SELECT sc.student_id
         FROM student_centers sc
         INNER JOIN center_facilitators cf ON cf.center_id = sc.center_id
         WHERE cf.facilitator_id = $1 AND sc.student_id = $2 AND sc.is_current = TRUE`,
        [req.user!.id, studentId],
      );
      if (inCenter.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You can only view gradebooks of students in your centers.",
        });
        return;
      }
    }

    const student = await pool.query(
      `SELECT id, first_name, last_name FROM students WHERE id = $1`,
      [studentId],
    );
    if (student.rows.length === 0) {
      res.status(404).json({ success: false, message: "Student not found." });
      return;
    }

    const modulesResult = await pool.query(
      `SELECT id, number, title, weight FROM course_modules
   WHERE course_id = $1 ORDER BY number ASC`,
      [courseId],
    );

    const answersResult = await pool.query(
      `SELECT module_number, answers, coins_awarded, updated_at AS submitted_at
   FROM student_quiz_answers
   WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId],
    );

    // ── Batch fetch quiz parts and questions — replaces per-module queries
    const moduleIds = modulesResult.rows.map((m) => m.id);
    const { quizPartByModuleId, questionsByPartId } =
      await batchFetchQuizData(moduleIds);

    const {
      modules: gradebook,
      overallScore,
      overallPassed,
      totalQuestions,
      totalCorrect,
    } = buildStudentGradebook(
      modulesResult.rows,
      quizPartByModuleId,
      questionsByPartId,
      answersResult.rows,
    );

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.rows[0].id,
          firstName: student.rows[0].first_name,
          lastName: student.rows[0].last_name,
        },
        courseId: Number(courseId),
        overallScore,
        overallPassed,
        totalQuestions,
        totalCorrect,
        modules: gradebook,
      },
    });
  } catch (err) {
    console.error("getStudentGradebook error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Get Gradebook for an entire Center (class-wide "Gradebook" view — one
// row per student, one column per module — as distinct from the per-student
// "grade standing" drill-down above)
export const getCenterGradebook = async (req: AuthRequest, res: Response) => {
  try {
    const { centerId } = req.params;
    const { courseId } = req.query;

    if (isNaN(Number(centerId))) {
      res.status(400).json({ success: false, message: "Invalid center ID." });
      return;
    }
    if (!courseId || isNaN(Number(courseId))) {
      res
        .status(400)
        .json({ success: false, message: "Valid courseId is required." });
      return;
    }

    const center = await pool.query(`SELECT id FROM centers WHERE id = $1`, [
      centerId,
    ]);
    if (center.rows.length === 0) {
      res.status(404).json({ success: false, message: "Center not found." });
      return;
    }

    if (req.user!.role === "facilitator") {
      const assigned = await pool.query(
        `SELECT id FROM center_facilitators WHERE center_id = $1 AND facilitator_id = $2`,
        [centerId, req.user!.id],
      );
      if (assigned.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this center.",
        });
        return;
      }
    }

    const studentsResult = await pool.query(
      `SELECT s.id, s.id_number, s.first_name, s.last_name
       FROM students s
       INNER JOIN student_centers sc ON sc.student_id = s.id
       WHERE sc.center_id = $1 AND sc.is_current = TRUE
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [centerId],
    );

    const modulesResult = await pool.query(
      `SELECT id, number, title, weight FROM course_modules
   WHERE course_id = $1 ORDER BY number ASC`,
      [courseId],
    );

    const moduleIds = modulesResult.rows.map((m) => m.id);
    const { quizPartByModuleId, questionsByPartId } =
      await batchFetchQuizData(moduleIds);

    const studentIds = studentsResult.rows.map((s) => s.id);

    const answersResult =
      studentIds.length > 0
        ? await pool.query(
            `SELECT student_id, module_number, answers, coins_awarded, updated_at AS submitted_at
       FROM student_quiz_answers
       WHERE student_id = ANY($1) AND course_id = $2`,
            [studentIds, courseId],
          )
        : { rows: [] };

    const answersByStudentId = new Map<number, StudentAnswerRow[]>();
    for (const row of answersResult.rows) {
      if (!answersByStudentId.has(row.student_id)) {
        answersByStudentId.set(row.student_id, []);
      }
      answersByStudentId.get(row.student_id)!.push(row);
    }

    const students = studentsResult.rows.map((s) => {
      const { modules, overallScore, overallPassed } = buildStudentGradebook(
        modulesResult.rows,
        quizPartByModuleId,
        questionsByPartId,
        answersByStudentId.get(s.id) ?? [],
      );

      return {
        studentId: s.id,
        idNumber: s.id_number,
        firstName: s.first_name,
        lastName: s.last_name,
        modules,
        overallScore,
        overallPassed,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        centerId: Number(centerId),
        courseId: Number(courseId),
        modules: modulesResult.rows.map((m) => ({
          moduleNumber: m.number,
          moduleTitle: m.title,
          moduleWeight: m.weight ?? null,
        })),
        students,
      },
    });
  } catch (err) {
    console.error("getCenterGradebook error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
