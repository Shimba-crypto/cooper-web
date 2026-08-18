import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { API_URL } from "./config";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import PapersListPage from "./pages/PapersListPage";
import PaperViewPage from "./pages/PaperViewPage";
import QuizListPage from "./pages/QuizListPage";
import QuizTakePage from "./pages/QuizTakePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import InvitePage from "./pages/InvitePage";
import ClaimPage from "./pages/ClaimPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import CertificatePage from "./pages/CertificatePage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import NotesListPage from "./pages/NotesListPage";
import NoteViewPage from "./pages/NoteViewPage";
import ProgressPage from "./pages/ProgressPage";
import ReportProblemPage from "./pages/ReportProblemPage";
import CreateQuizPage from "./pages/CreateQuizPage";
import SearchPage from "./pages/SearchPage";
import ParentDashboardPage from "./pages/ParentDashboardPage";
import RandomPaperPage from "./pages/RandomPaperPage";
import ReferralsPage from "./pages/ReferralsPage";
import ChallengePage from "./pages/ChallengePage";
import ProgressReportPage from "./pages/ProgressReportPage";
import PaymentsPage from "./pages/PaymentsPage";
import NexasWalletPage from "./pages/NexasWalletPage";
import JohnWebPage from "./pages/JohnWebPage";
import AppsPage from "./pages/AppsPage";
import InstallPage from "./pages/InstallPage";
import ApiDocsPage from "./pages/ApiDocsPage";
import PeoplePage from "./pages/PeoplePage";
import MarketPage from "./pages/MarketPage";
import CardPage from "./pages/CardPage";
import TradingCenterPage from "./pages/TradingCenterPage";
import AIChatPage from "./pages/AIChatPage";
import { useTheme } from "./hooks/useTheme";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { usePageAnalytics } from "./hooks/usePageAnalytics";

function AnalyticsTracker() {
  usePageAnalytics();
  return null;
}

// Keep the API warm: free Render instances spin down after ~15 min of
// inactivity, costing users a 50s cold start. Anyone with the site open pings
// the API every 10 minutes, fire-and-forget.
function Heartbeat() {
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/api/health`).catch(() => {});
    ping();
    const timer = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return null;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("cooperweb:sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <Heartbeat />
      <div className="flex min-h-screen flex-col">
        <Navbar theme={theme} toggleTheme={toggleTheme} onMenuClick={() => setMobileOpen(true)} />
        <div className="flex flex-1">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <main className="min-w-0 flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/papers" element={<PapersListPage />} />
              <Route path="/paper/:id" element={<PaperViewPage />} />
              <Route path="/quizzes" element={<QuizListPage />} />
              <Route path="/quiz/:id" element={<QuizTakePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/claim/:token" element={<ClaimPage />} />
              <Route path="/invite/:token" element={<InvitePage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/profile/:uid" element={<ProfilePage />} />
              <Route path="/settings" element={<EditProfilePage />} />
              <Route path="/certificate/:quizId" element={<CertificatePage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/group/:gid" element={<GroupDetailPage />} />
              <Route path="/notes" element={<NotesListPage />} />
              <Route path="/notes/:id" element={<NoteViewPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/report" element={<ReportProblemPage />} />
              <Route path="/create-quiz" element={<CreateQuizPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/parent" element={<ParentDashboardPage />} />
              <Route path="/generate" element={<RandomPaperPage />} />
              <Route path="/referrals" element={<ReferralsPage />} />
              <Route path="/challenge" element={<ChallengePage />} />
              <Route path="/challenge/:cid" element={<ChallengePage />} />
              <Route path="/progress-report" element={<ProgressReportPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/wallet" element={<NexasWalletPage />} />
              <Route path="/john-web" element={<JohnWebPage />} />
              <Route path="/apps" element={<AppsPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/api-docs" element={<ApiDocsPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/card" element={<CardPage />} />
              <Route path="/trading" element={<TradingCenterPage />} />
              <Route path="/ai-chat" element={<AIChatPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
        </div>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          © {new Date().getFullYear()} CooperWeb — ECZ Grade 7 past papers, quizzes & mock exams.
        </footer>
      </div>
    </BrowserRouter>
  );
}
