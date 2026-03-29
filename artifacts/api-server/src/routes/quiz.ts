import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  shareLinksTable,
  setPiecesTable,
  setPieceRolesTable,
  roleAssignmentsTable,
  quizAttemptsTable,
  playerReadinessTable,
  auditEventsTable,
} from "@workspace/db";
import { parseParam } from "../lib/authorization";

const router: IRouter = Router();

interface QuizQuestion {
  id: string;
  type: "tap_zone" | "multiple_choice" | "yes_no";
  prompt: string;
  options?: string[];
  correctAnswer: unknown;
}

function generateQuizQuestions(
  role: { name: string; startPosition: { x: number; y: number } | null; coachingPoint: string | null; movementPath: Array<{ x: number; y: number }> | null },
  setPieceTitle: string,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];

  if (role.startPosition) {
    questions.push({
      id: "q1_start_zone",
      type: "tap_zone",
      prompt: `Tap your start position for "${setPieceTitle}"`,
      correctAnswer: role.startPosition,
    });
  }

  if (role.movementPath && role.movementPath.length > 0) {
    const directions = ["Near post", "Far post", "Edge of box", "Short corner"];
    questions.push({
      id: "q2_first_run",
      type: "multiple_choice",
      prompt: `What is your first run in "${setPieceTitle}"?`,
      options: directions,
      correctAnswer: directions[0],
    });
  }

  questions.push({
    id: "q3_understand",
    type: "yes_no",
    prompt: `Do you understand your role as ${role.name}?`,
    correctAnswer: true,
  });

  if (role.coachingPoint) {
    questions.push({
      id: "q4_coaching",
      type: "yes_no",
      prompt: `Key coaching point: "${role.coachingPoint}" — Got it?`,
      correctAnswer: true,
    });
  }

  return questions;
}

function scoreAnswers(
  submitted: Array<{ questionId: string; answer: unknown }>,
  canonical: QuizQuestion[],
): { score: number; total: number; passed: boolean; gradedAnswers: Array<{ questionId: string; answer: unknown; correct: boolean }> } {
  const total = canonical.length;
  let correct = 0;
  const gradedAnswers = [];

  for (const q of canonical) {
    const submittedAnswer = submitted.find((a) => a.questionId === q.id);
    let isCorrect = false;

    if (submittedAnswer) {
      if (q.type === "yes_no") {
        isCorrect = submittedAnswer.answer === q.correctAnswer;
      } else if (q.type === "multiple_choice") {
        isCorrect = submittedAnswer.answer === q.correctAnswer;
      } else if (q.type === "tap_zone") {
        const target = q.correctAnswer as { x: number; y: number };
        const answer = submittedAnswer.answer as { x: number; y: number };
        if (answer && typeof answer.x === "number" && typeof answer.y === "number") {
          const dist = Math.sqrt(Math.pow(target.x - answer.x, 2) + Math.pow(target.y - answer.y, 2));
          isCorrect = dist <= 15;
        }
      }
    }

    if (isCorrect) correct++;
    gradedAnswers.push({
      questionId: q.id,
      answer: submittedAnswer?.answer ?? null,
      correct: isCorrect,
    });
  }

  return {
    score: total > 0 ? Math.round((correct / total) * 100) : 0,
    total,
    passed: correct >= Math.ceil(total * 0.7),
    gradedAnswers,
  };
}

function validateShareLink(link: {
  revokedAt: Date | null;
  expiresAt: Date | null;
}): string | null {
  if (link.revokedAt) return "This share link has been revoked";
  if (link.expiresAt && link.expiresAt < new Date()) return "This share link has expired";
  return null;
}

router.get("/p/:shareToken/quiz", async (req, res): Promise<void> => {
  const shareToken = parseParam(req.params.shareToken);
  const setPieceId = req.query.setPieceId as string;

  if (!setPieceId) {
    res.status(400).json({ error: "setPieceId is required" });
    return;
  }

  const [link] = await db
    .select()
    .from(shareLinksTable)
    .where(eq(shareLinksTable.token, shareToken));

  if (!link) {
    res.status(404).json({ error: "Invalid share link" });
    return;
  }

  const validationError = validateShareLink(link);
  if (validationError) {
    res.status(404).json({ error: validationError });
    return;
  }

  if (link.allowedSetPieceIds && link.allowedSetPieceIds.length > 0 && !link.allowedSetPieceIds.includes(setPieceId)) {
    res.status(403).json({ error: "Set piece not in scope for this link" });
    return;
  }

  const [setPiece] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, link.teamId)));

  if (!setPiece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, setPieceId));

  let playerRole = roles[0] || null;
  let roleId = playerRole?.id || null;

  if (link.playerScope && link.playerScope.length > 0) {
    for (const role of roles) {
      const [assignment] = await db
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, role.id));
      if (assignment && link.playerScope.includes(assignment.playerId)) {
        playerRole = role;
        roleId = role.id;
        break;
      }
    }
  }

  const questions = playerRole
    ? generateQuizQuestions(playerRole, setPiece.title)
    : [];

  const safeQuestions = questions.map(({ correctAnswer, ...q }) => q);

  res.json({
    setPieceId,
    roleId,
    questions: safeQuestions,
  });
});

router.post("/p/:shareToken/quiz", async (req, res): Promise<void> => {
  const shareToken = parseParam(req.params.shareToken);

  const [link] = await db
    .select()
    .from(shareLinksTable)
    .where(eq(shareLinksTable.token, shareToken));

  if (!link) {
    res.status(404).json({ error: "Invalid share link" });
    return;
  }

  const validationError = validateShareLink(link);
  if (validationError) {
    res.status(404).json({ error: validationError });
    return;
  }

  const { playerId, setPieceId, roleId, answers } = req.body;

  if (!playerId || !setPieceId || !answers) {
    res.status(400).json({ error: "playerId, setPieceId, and answers are required" });
    return;
  }

  if (link.playerScope && link.playerScope.length > 0 && !link.playerScope.includes(playerId)) {
    res.status(403).json({ error: "Player not in scope for this link" });
    return;
  }

  if (link.allowedSetPieceIds && link.allowedSetPieceIds.length > 0 && !link.allowedSetPieceIds.includes(setPieceId)) {
    res.status(403).json({ error: "Set piece not in scope for this link" });
    return;
  }

  const [setPiece] = await db
    .select()
    .from(setPiecesTable)
    .where(and(eq(setPiecesTable.id, setPieceId), eq(setPiecesTable.teamId, link.teamId)));

  if (!setPiece) {
    res.status(404).json({ error: "Set piece not found" });
    return;
  }

  const roles = await db
    .select()
    .from(setPieceRolesTable)
    .where(eq(setPieceRolesTable.setPieceId, setPieceId));

  let playerRole = roles[0] || null;
  if (roleId) {
    const match = roles.find((r) => r.id === roleId);
    if (match) playerRole = match;
  } else if (link.playerScope && link.playerScope.length > 0) {
    for (const role of roles) {
      const [assignment] = await db
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, role.id));
      if (assignment && link.playerScope.includes(assignment.playerId)) {
        playerRole = role;
        break;
      }
    }
  }

  const canonicalQuestions = playerRole
    ? generateQuizQuestions(playerRole, setPiece.title)
    : [];

  const { score, total, passed, gradedAnswers } = scoreAnswers(answers, canonicalQuestions);

  const [attempt] = await db
    .insert(quizAttemptsTable)
    .values({
      playerId,
      setPieceId,
      roleId: roleId || null,
      completedAt: new Date(),
      passed,
      score,
      answers: gradedAnswers,
    })
    .returning();

  const existingReadiness = await db
    .select()
    .from(playerReadinessTable)
    .where(
      and(
        eq(playerReadinessTable.playerId, playerId),
        eq(playerReadinessTable.setPieceId, setPieceId),
      ),
    );

  if (existingReadiness.length > 0) {
    await db
      .update(playerReadinessTable)
      .set({
        status: passed ? "passed" : "needs_review",
        quizCompletedAt: new Date(),
      })
      .where(eq(playerReadinessTable.id, existingReadiness[0].id));
  } else {
    await db.insert(playerReadinessTable).values({
      playerId,
      setPieceId,
      roleId: roleId || null,
      status: passed ? "passed" : "needs_review",
      quizCompletedAt: new Date(),
      viewCount: 0,
    });
  }

  await db.insert(auditEventsTable).values({
    teamId: link.teamId,
    eventType: "quiz_submitted",
    entityType: "quiz_attempt",
    entityId: attempt.id,
    metadata: { playerId, setPieceId, passed, score },
  });

  res.json({ passed, score, total });
});

export default router;
