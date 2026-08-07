// Merge the 5-question topic quizzes into full-length subject quizzes (50-60 questions),
// dedupe questions within every quiz, and write database/quizzes.json.
// Run: node scripts/rebuild-quizzes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../database/quizzes.json", import.meta.url));
const data = JSON.parse(readFileSync(path, "utf8"));
const quizzes = data.quizzes;

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function dedupe(questions) {
  const seen = new Set();
  return questions.filter((q) => {
    const k = norm(q.text);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const MERGES = [
  {
    id: "math-full-grade-7",
    title: "Mathematics Full Practice — Grade 7",
    subject: "Mathematics",
    year: 2024,
    sourceIds: [
      "mathematics-grade-7",
      "mathematics-paper-2-grade-7",
      "math-arithmetic",
      "math-fractions",
      "math-decimals-percentages",
      "math-geometry",
      "math-measurement",
      "math-perimeter-area",
      "math-time-money",
      "math-algebra",
      "math-patterns",
      "math-word-problems",
    ],
  },
  {
    id: "english-full-grade-7",
    title: "English Full Practice — Grade 7",
    subject: "English",
    year: 2024,
    sourceIds: [
      "english-grade-7",
      "eng-grammar",
      "eng-tenses",
      "eng-punctuation",
      "eng-synonyms-antonyms",
      "eng-plurals-spelling",
      "eng-sentences",
      "eng-vocabulary",
      "eng-homophones",
      "paper-english-2024",
    ],
  },
  {
    id: "science-full-grade-7",
    title: "Science Full Practice — Grade 7",
    subject: "Science",
    year: 2024,
    sourceIds: [
      "science-grade-7",
      "sci-human-body",
      "sci-plants",
      "sci-animals",
      "sci-matter",
      "sci-forces-machines",
      "sci-energy",
      "sci-earth-space",
      "sci-health",
      "sci-weather",
      "sci-materials",
      "paper-science-2024",
    ],
  },
  {
    id: "social-studies-full-grade-7",
    title: "Social Studies Full Practice — Grade 7",
    subject: "Social Studies",
    year: 2024,
    sourceIds: [
      "social-studies-grade-7",
      "sst-zambia-geography",
      "sst-history",
      "sst-map-skills",
      "sst-continents-oceans",
      "sst-resources",
      "sst-trade-economy",
      "sst-provincial-capitals",
      "sst-culture",
      "sst-sectors",
    ],
  },
  {
    id: "civic-education-full-grade-7",
    title: "Civic Education Full Practice — Grade 7",
    subject: "Civic Education",
    year: 2024,
    sourceIds: ["civic-education-grade-7", "civ-constitution", "civ-democracy", "civ-national-symbols"],
  },
  {
    id: "religious-education-full-grade-7",
    title: "Religious Education Full Practice — Grade 7",
    subject: "Religious Education",
    year: 2024,
    sourceIds: ["religious-education-grade-7"],
  },
];

const KEEP_IDS = new Set([
  "paper-english-2017",
  "paper-mathematics-2011",
  "paper-mathematics-2013",
  "paper-mathematics-2014",
  "paper-mathematics-2015",
  "paper-mathematics-2016",
  "paper-mathematics-2017",
  "paper-mathematics-2022",
  "paper-science-2017",
  "paper-psle-2024-mathematics",
  "special-paper-1-grade-7",
  "special-paper-2-grade-7",
]);

const sourceIds = new Set(MERGES.flatMap((m) => m.sourceIds));
for (const id of Object.keys(quizzes)) {
  if (!KEEP_IDS.has(id) && !sourceIds.has(id)) {
    console.log(`Deleting unused quiz: ${id}`);
    delete quizzes[id];
  }
}

for (const merge of MERGES) {
  const all = merge.sourceIds.flatMap((id) => {
    if (!quizzes[id]) {
      console.log(`Missing source quiz: ${id}`);
      return [];
    }
    return quizzes[id].questions;
  });
  const unique = dedupe(all).slice(0, 60);
  quizzes[merge.id] = {
    title: merge.title,
    subject: merge.subject,
    year: merge.year,
    durationMinutes: unique.length,
    questions: unique,
  };
  for (const id of merge.sourceIds) delete quizzes[id];
  console.log(`Created ${merge.id}: ${unique.length} questions (deduped ${all.length - unique.length}).`);
}

for (const [id, q] of Object.entries(quizzes)) {
  const before = q.questions.length;
  q.questions = dedupe(q.questions);
  q.durationMinutes = q.questions.length;
  if (q.questions.length !== before) {
    console.log(`Deduped ${id}: ${before} -> ${q.questions.length}`);
  }
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
const counts = Object.entries(quizzes).map(([id, q]) => `${id} (${q.questions.length})`);
console.log("\nFinal quizzes:");
counts.forEach((c) => console.log(" ", c));
