import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "C:/Users/pc/Desktop/johnweb";
const DEST = join(process.cwd(), "database", "quizzes.json");

const files = readdirSync(SRC).filter((f) => f.endsWith(".txt")).sort();

function parseFile(name) {
  const lines = readFileSync(join(SRC, name), "utf8").split(/\r?\n/);
  const questions = [];
  let cur = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const qMatch = line.match(/^(\d+)\.\s*(.*)$/);
    if (qMatch && !/^[A-D]\)/.test(line)) {
      if (cur) questions.push(cur);
      cur = { num: parseInt(qMatch[1]), text: qMatch[2], options: [], answer: null };
      continue;
    }

    if (!cur) continue;

    const optMatch = line.match(/^([A-D])\)\s*(.*)$/);
    if (optMatch) {
      cur.options.push(optMatch[2]);
      continue;
    }

    const ansMatch = line.match(/^Answers?\s*:\s*(.*)$/i);
    if (ansMatch) {
      const rest = ansMatch[1].trim();
      const m = rest.match(/^([A-D])[).]?\s*$/i);
      if (m) {
        cur.answer = m[1].toUpperCase();
        cur.answerText = "";
      } else {
        cur.answer = null;
        cur.answerText = rest;
      }
      continue;
    }

    if (/^Marks:/i.test(line)) continue;

    if (cur.options.length === 0 && !cur.text.endsWith("...") && !/^\(i\)/.test(line)) {
      cur.text += " " + line;
    }
  }
  if (cur) questions.push(cur);
  return questions;
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveIndex(q) {
  if (q.answer) {
    if (q.answer >= "A" && q.answer <= "D" && q.options[q.answer.charCodeAt(0) - 65] !== undefined) {
      if (q.answerText) {
        const want = normalize(q.answerText);
        const opt = normalize(q.options[q.answer.charCodeAt(0) - 65]);
        if (want && opt && want !== opt) {
          const i = q.options.findIndex((o) => normalize(o) === want);
          if (i >= 0) return i;
        }
      }
      return q.answer.charCodeAt(0) - 65;
    }
  }
  if (q.answerText) {
    const want = normalize(q.answerText);
    const i = q.options.findIndex((o) => normalize(o) === want);
    if (i >= 0) return i;
    if (want.length >= 3) {
      const j = q.options.findIndex(
        (o) => {
          const opt = normalize(o);
          return opt.length >= 3 && (opt.startsWith(want) || want.startsWith(opt));
        }
      );
      if (j >= 0) return j;
    }
  }
  return null;
}

const quizIdFromName = (name) => {
  const m = name.replace(/^G7-/, "").replace(/\.txt$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `paper-${m}`;
};

const subjectFromName = (name) => {
  if (/mathematics/i.test(name)) return "Mathematics";
  if (/english/i.test(name)) return "English";
  if (/science/i.test(name)) return "Science";
  return "Other";
};

const data = JSON.parse(readFileSync(DEST, "utf8"));
const skipped = [];
const added = [];

for (const name of files) {
  const yearMatch = name.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2024;
  const subject = subjectFromName(name);
  const id = quizIdFromName(name);

  const questions = [];
  for (const q of parseFile(name)) {
    const ci = resolveIndex(q);
    if (q.options.length < 2) {
      skipped.push(`${name} Q${q.num}: no options`);
      continue;
    }
    if (ci === null) {
      skipped.push(`${name} Q${q.num}: no resolvable answer`);
      continue;
    }
    questions.push({
      id: `${id}-q${q.num}`,
      text: q.text,
      options: q.options,
      correctIndex: ci,
      explanation: `Correct answer: ${q.options[ci]}`,
    });
  }

  if (questions.length === 0) {
    skipped.push(`${name}: no usable questions`);
    continue;
  }

  data.quizzes[id] = {
    title: subject === "Mathematics" && /psle/i.test(name)
      ? `PSLE Mathematics ${year}`
      : `ECZ Grade 7 ${subject} ${year}`,
    subject,
    year,
    durationMinutes: questions.length,
    questions,
  };
  added.push(`${id} (${questions.length} questions)`);
}

writeFileSync(DEST, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Added:", added.join(", "));
console.log("Skipped:", skipped.length ? skipped.join(" | ") : "none");
console.log("Total quizzes now:", Object.keys(data.quizzes).length);
