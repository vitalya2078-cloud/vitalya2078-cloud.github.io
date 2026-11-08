import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const bankPath = join(
  process.cwd(),
  "android",
  "app",
  "src",
  "main",
  "assets",
  "official-question-bank.json",
);

const bank = JSON.parse(readFileSync(bankPath, "utf8"));

assert.equal(bank.immutableSource, true, "The official bank must be immutable.");
assert.equal(bank.expectedQuestionCount, 900);
assert.equal(bank.questions.length, 900);

const ids = new Set();
const topicNumbers = new Map();

for (const question of bank.questions) {
  assert.ok(question.id, "Every question needs a stable ID.");
  assert.ok(!ids.has(question.id), `Duplicate question ID: ${question.id}`);
  ids.add(question.id);

  assert.ok(question.original_payload, `Missing original payload: ${question.id}`);
  assert.equal(
    question.original_text,
    question.original_payload.t,
    `Question wording differs from the original payload: ${question.id}`,
  );
  assert.deepEqual(
    question.original_options,
    question.original_payload.x,
    `Distractors differ from the original payload: ${question.id}`,
  );
  assert.equal(
    question.original_correct_answer,
    question.original_payload.a,
    `Correct answer differs from the original payload: ${question.id}`,
  );

  const expectedIllustrations = question.original_payload.p
    ? [question.original_payload.p]
    : [];
  assert.deepEqual(
    question.original_illustration_refs,
    expectedIllustrations,
    `Illustration references differ from the original payload: ${question.id}`,
  );

  assert.ok(question.original_payload.e, `Missing explanation: ${question.id}`);
  assert.ok(question.source_question_number >= 1 && question.source_question_number <= 100);

  const topic = topicNumbers.get(question.topic_code) ?? new Set();
  assert.ok(
    !topic.has(question.source_question_number),
    `Duplicate question number in topic ${question.topic_code}`,
  );
  topic.add(question.source_question_number);
  topicNumbers.set(question.topic_code, topic);
}

assert.equal(topicNumbers.size, 9, "The bank must contain nine legacy topics.");
for (const [topicCode, numbers] of topicNumbers) {
  assert.equal(numbers.size, 100, `Topic ${topicCode} must contain 100 questions.`);
  assert.deepEqual(
    [...numbers].sort((a, b) => a - b),
    Array.from({ length: 100 }, (_, index) => index + 1),
    `Topic ${topicCode} must contain question numbers 1 through 100.`,
  );
  assert.equal(bank.topicCounts[topicCode], 100);
}

console.log("Official PHYSICS bank integrity passed: 900 immutable questions, 9 topics × 100.");
