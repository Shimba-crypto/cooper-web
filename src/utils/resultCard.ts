import type { Quiz } from "../types";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderResultCard(quiz: Quiz, score: number, displayName: string): string {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const pct = Math.round((score / quiz.questions.length) * 100);

  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#065f46");
  gradient.addColorStop(0.55, "#0f766e");
  gradient.addColorStop(1, "#134e4a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(940, 120, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, 1000, 200, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 46px Inter, sans-serif";
  ctx.fillText("CooperWeb", W / 2, 110);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "500 30px Inter, sans-serif";
  ctx.fillText("ECZ Grade 7 Study Platform", W / 2, 165);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 54px Inter, sans-serif";
  const titleLines = wrapText(ctx, quiz.title, 800).slice(0, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 320 + i * 70);
  });
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "500 34px Inter, sans-serif";
  ctx.fillText(`${quiz.subject} · ${quiz.year}`, W / 2, 320 + titleLines.length * 70 + 45);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, 240, 470, 600, 320, 36);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 190px Inter, sans-serif";
  ctx.fillText(`${score}/${quiz.questions.length}`, W / 2, 700);

  ctx.fillStyle = pct >= 75 ? "#6ee7b7" : pct >= 50 ? "#fcd34d" : "#fca5a5";
  ctx.font = "700 52px Inter, sans-serif";
  ctx.fillText(`${pct}%`, W / 2, 790);

  const message =
    pct >= 75
      ? "Excellent work! Keep it up."
      : pct >= 50
        ? "Good job! A little more practice and you're there."
        : "Keep practicing — every quiz makes you stronger!";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "500 36px Inter, sans-serif";
  ctx.fillText(message, W / 2, 900);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 40px Inter, sans-serif";
  const name = displayName.trim() || "Student";
  ctx.fillText(name, W / 2, 975);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "500 28px Inter, sans-serif";
  ctx.fillText(`Score saved on ${new Date().toLocaleDateString()}`, W / 2, 1030);

  return canvas.toDataURL("image/png");
}

export function waShareText(quiz: Quiz, score: number, displayName: string) {
  const pct = Math.round((score / quiz.questions.length) * 100);
  const name = displayName.trim() || "Student";
  return encodeURIComponent(
    `I'm ${name} and I scored ${score}/${quiz.questions.length} (${pct}%) on "${quiz.title}" on CooperWeb! Can you beat me? https://chikondi-dot.web.app`
  );
}
