export type PaperType = "Paper 1" | "Paper 2" | "Practical";

export interface Paper {
  id: string;
  title: string;
  subject: string;
  grade: number;
  year: number;
  paperType: PaperType;
  pdfUrl: string;
  markingUrl?: string;
  description: string;
  baseRating?: number;
  baseRatingCount?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  year: number;
  durationMinutes: number;
  questions: Question[];
  premium?: boolean;
}

export type UserRole = "user" | "admin";
export type PlanId = "admin" | "free" | "student_plus" | "teacher_plus" | "teacher_full";

export interface UserPlan {
  id: PlanId;
  activatedAt: number;
  claimedVia?: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: number;
  plan?: UserPlan;
  avatarUrl?: string;
  unlockedQuizIds?: string[];
  discount?: { percent: number; code: string; redeemedAt: number };
}

export interface Profile {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: number;
}

export interface QuizResult {
  score: number;
  total: number;
  completedAt: number;
}

export interface LeaderboardEntry {
  displayName: string;
  totalScore: number;
  quizzesTaken: number;
  lastUpdated: number;
}

export interface ClaimCode {
  planId: Exclude<PlanId, "free" | "admin">;
  createdAt: number;
  createdBy: string;
  usageLimit: number;
  usedCount: number;
  claimedBy?: string;
  claimedByEmail?: string;
  claimedAt?: number;
}

export interface Announcement {
  id: string;
  text: string;
  createdAt: number;
  createdBy: string;
  dismissible: boolean;
  active: boolean;
}

export type GroupRole = "teacher" | "student";

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  joinCode: string;
  createdAt: number;
}

export interface GroupMember {
  displayName: string;
  email?: string;
  role: GroupRole;
  joinedAt: number;
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: number;
  createdBy: string;
}

export interface Report {
  id: string;
  userId: string;
  userEmail?: string;
  quizId?: string;
  questionId?: string;
  type: "incorrect_answer" | "typo" | "unclear" | "other";
  message: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: number;
}

export interface Notification {
  id: string;
  type: "info" | "new_quiz" | "announcement" | "assignment" | "achievement";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: number;
}

export interface UserQuiz {
  id: string;
  title: string;
  subject: string;
  year: number;
  durationMinutes: number;
  questions: Question[];
  createdBy: string;
  creatorName: string;
  createdAt: number;
  public: boolean;
}

export interface DailyQuestion {
  quizId: string;
  date: string;
  updatedAt: number;
}

export interface ParentLink {
  parentUid: string;
  childUid: string;
  childName: string;
  createdAt: number;
}

export interface ChallengePlayer {
  uid: string;
  displayName: string;
  answers: number[];
  submitted: boolean;
  score: number | null;
  total: number | null;
  completedAt: number | null;
}

export interface Challenge {
  id: string;
  quizId: string;
  quizTitle: string;
  createdBy: string;
  createdAt: number;
  players: Record<string, ChallengePlayer>;
}

export interface PaymentRecord {
  id: string;
  uid: string;
  email: string;
  planId: PlanId;
  amount: number;
  method: "mtn" | "airtel";
  phone: string;
  status: "pending" | "confirmed" | "rejected";
  createdAt: number;
  confirmedAt?: number;
}

export interface Referral {
  childUid: string;
  childName: string;
  createdAt: number;
}

export interface ReferralCode {
  uid: string;
  code: string;
  createdAt: number;
}

export type RedeemCodeType = "gift" | "promo" | "discount" | "pack";

export interface RedeemCode {
  code: string;
  type: RedeemCodeType;
  planId?: Exclude<PlanId, "free" | "admin">;
  amount: number;
  usedCount: number;
  discountPercent?: number;
  quizIds?: string[];
  expiresAt?: number;
  createdBy: string;
  createdAt: number;
}

export interface RedeemRecord {
  code: string;
  type: RedeemCodeType;
  planId?: Exclude<PlanId, "free" | "admin">;
  discountPercent?: number;
  quizIds?: string[];
  redeemedAt: number;
}
