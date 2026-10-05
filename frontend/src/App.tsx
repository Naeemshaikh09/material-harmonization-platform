import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { ToastProvider } from "./state/ToastContext";
import AppShell, { roleHome } from "./components/layout/AppShell";
import Login from "./pages/Login";
import Portal from "./pages/Portal";
import Workbench from "./pages/Workbench";
import Golden from "./pages/Golden";
import GoldenDetail from "./pages/GoldenDetail";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import type { Role } from "./lib/types";

// Routes each role is allowed to visit. "all" = every authenticated role.
const ROUTE_ROLES: Record<string, Role[] | "all"> = {
  "/portal":    ["UPLOADER", "ADMIN"],
  "/workbench": ["STEWARD", "APPROVER", "ADMIN"],
  "/golden":    "all",
  "/dashboard": "all",
  "/admin":     ["ADMIN", "AUDITOR"],
};

function Protected({ children, path }: { children: ReactNode; path: string }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  const allowed = ROUTE_ROLES[path];
  if (allowed !== "all" && !(allowed as Role[]).includes(user.role)) {
    // Role not permitted here — send to that role's home page.
    return <Navigate to={roleHome[user.role]} replace />;
  }

  return <>{children}</>;
}

function Shell({
  title,
  subtitle,
  path,
  children,
}: {
  title: string;
  subtitle?: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <Protected path={path}>
      <AppShell title={title} subtitle={subtitle}>
        {children}
      </AppShell>
    </Protected>
  );
}

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? roleHome[user.role] : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/portal"
            element={
              <Shell path="/portal" title="CPSE Portal" subtitle="Search before you create · upload · my items">
                <Portal />
              </Shell>
            }
          />
          <Route
            path="/workbench"
            element={
              <Shell path="/workbench" title="Steward Workbench" subtitle="Compare, decide, record — wrong merge is worse than a duplicate">
                <Workbench />
              </Shell>
            }
          />
          <Route
            path="/golden"
            element={
              <Shell path="/golden" title="Golden Records" subtitle="One CMC per distinct material · 20 governed dimensions">
                <Golden />
              </Shell>
            }
          />
          <Route
            path="/golden/:code"
            element={
              <Shell path="/golden" title="Golden Record" subtitle="Identity, links, history and procurement for one CMC">
                <GoldenDetail />
              </Shell>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Shell path="/dashboard" title="Dashboard" subtitle="Harmonization progress, coverage and procurement intelligence">
                <Dashboard />
              </Shell>
            }
          />
          <Route
            path="/admin"
            element={
              <Shell path="/admin" title="Admin Console" subtitle="Reference data · migration · audit chain · users">
                <Admin />
              </Shell>
            }
          />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
