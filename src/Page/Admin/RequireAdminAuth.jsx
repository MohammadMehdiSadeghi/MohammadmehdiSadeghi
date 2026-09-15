import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../Hooks/useAdminAuth";

export default function RequireAdminAuth({ children }) {
  const { token, valid, checking } = useAdminAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-[#90A1B9] text-[12px]">
        _checking-session...
      </div>
    );
  }

  if (!valid) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
