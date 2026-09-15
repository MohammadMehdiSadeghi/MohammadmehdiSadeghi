import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";

export default function AdminLogin() {
  const { token, valid, checking, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // already logged in with a valid session -> skip the login screen
  if (token && valid && !checking) {
    const redirectTo = location.state?.from || "/admin/stats";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/stats", { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden shadow-2xl">
        <div className="h-10 flex items-center gap-2 px-4 bg-[#0b1220] border-b border-[#1E293B]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          <p className="ml-2 text-[10px] text-[#68768C]">admin-login.sh</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6">
          <div>
            <p className="text-[#615FFF] text-[12px]">$ ./login --panel=admin</p>
            <h1 className="text-white text-[18px] mt-2">Admin Panel</h1>
            <p className="text-[#68768C] text-[11px] mt-1">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_username</p>
            <input
              className="bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7]"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_password</p>
            <input
              className="bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7]"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2">
              // {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "signing-in..." : "sign-in()"}
          </button>
        </form>
      </div>
    </div>
  );
}
