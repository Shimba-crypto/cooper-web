const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(prefix = "CW"): string {
  const block = (n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  };
  return `${prefix}-${block(4)}-${block(4)}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}

export function canAccessPremiumQuiz(
  planId: string,
  unlockedQuizIds: string[] | undefined,
  quiz: { id: string; premium?: boolean } | undefined
): boolean {
  if (!quiz?.premium) return true;
  if (planId === "admin" || planId === "teacher_full") return true;
  return unlockedQuizIds?.includes(quiz.id) ?? false;
}
