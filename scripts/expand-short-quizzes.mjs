// Expand short quizzes to at least 10-15 questions using matching past-paper questions.
// Run: node scripts/expand-short-quizzes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../database/quizzes.json", import.meta.url));
const data = JSON.parse(readFileSync(path, "utf8"));
const quizzes = data.quizzes;

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function pull(targetQuiz, sources, count, { tag }) {
  const existing = new Set(targetQuiz.questions.map((q) => norm(q.text)));
  const picked = [];
  const index = new Map(sources.map((s) => [s, 0]));
  const order = [];
  for (let i = 0; i < count; i++) {
    order.push(sources[i % sources.length]);
  }
  for (const srcKey of order) {
    const srcQuiz = quizzes[srcKey];
    if (!srcQuiz) continue;
    for (let i = index.get(srcKey); i < srcQuiz.questions.length; i++) {
      index.set(srcKey, i + 1);
      const q = srcQuiz.questions[i];
      if (existing.has(norm(q.text))) continue;
      existing.add(norm(q.text));
      picked.push({ ...q, id: `${tag}-q${picked.length + 1}` });
      if (picked.length >= count) break;
    }
    if (picked.length >= count) break;
  }
  targetQuiz.questions = [...targetQuiz.questions, ...picked];
}

const special1 = quizzes["special-paper-1-grade-7"];
const special2 = quizzes["special-paper-2-grade-7"];

pull(special1, ["paper-english-2017"], 10, { tag: "sp1" });
pull(special2, ["paper-mathematics-2011", "paper-mathematics-2017", "paper-psle-2024-mathematics"], 5, { tag: "sp2-math" });
pull(special2, ["paper-english-2017"], 5, { tag: "sp2-eng" });

for (const [id, q] of Object.entries(quizzes)) {
  q.durationMinutes = q.questions.length;
  if (id.startsWith("special-paper")) {
    console.log(`${id}: ${q.questions.length} questions`);
  }
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Saved database/quizzes.json");
