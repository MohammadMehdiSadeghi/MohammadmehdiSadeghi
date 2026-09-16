import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminAuthProvider } from "../../Hooks/useAdminAuth";
import ErrorBoundary from "../../Components/ErrorBoundary";
import AdminLogin from "./Login";
import AdminLayout from "./Layout";
import RequireAdminAuth from "./RequireAdminAuth";
import StatsPage from "./Stats";
import ProjectsPage from "./Projects";
import BlogPage from "./Blog";
import SkillsPage from "./Skills";
import MessagesPage from "./Messages";
import DatabasePage from "./Database";
import TelegramPage from "./Telegram";
import MoodsPage from "./Moods";
import SecurityPage from "./Security";

function AdminRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route
          element={
            <RequireAdminAuth>
              <AdminLayout />
            </RequireAdminAuth>
          }
        >
          <Route index element={<Navigate to="stats" replace />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="skills" element={<SkillsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="database" element={<DatabasePage />} />
          <Route path="telegram" element={<TelegramPage />} />
          <Route path="moods" element={<MoodsPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="*" element={<Navigate to="stats" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  );
}
