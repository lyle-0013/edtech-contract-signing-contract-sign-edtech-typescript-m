import test from "node:test";
import assert from "node:assert/strict";
import { deadlineStatus, reportLine } from "./contract_decision.ts";

test("educator report marks a learner overdue after the course deadline", () => {
  const now = new Date("2026-10-25T12:00:00.000Z");
  const input = { courseId: "ts-101", learnerId: "learner-7", learnerDeadline: "2026-10-25T11:59:00.000Z", educatorEmail: "teacher@example.com", html: "contract" };
  assert.equal(deadlineStatus(input.learnerDeadline, now), "overdue");
  assert.equal(reportLine(input, now), "ts-101 / learner-7: overdue");
});
