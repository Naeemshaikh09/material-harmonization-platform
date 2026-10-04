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

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Protected>
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
              <Shell title="CPSE Portal" subtitle="Search before you create · upload · my items">
                <Portal />
              </Shell>
            }
          />
          <Route
            path="/workbench"
            element={
              <Shell title="Steward Workbench" subtitle="Compare, decide, record — wrong merge is worse than a duplicate">
                <Workbench />
              </Shell>
            }
          />
          <Route
            path="/golden"
            element={
              <Shell title="Golden Records" subtitle="One CMC per distinct material · 20 governed dimensions">
                <Golden />
              </Shell>
            }
          />
          <Route
            path="/golden/:code"
            element={
              <Shell title="Golden Record" subtitle="Identity, links, history and procurement for one CMC">
                <GoldenDetail />
              </Shell>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Shell title="Dashboard" subtitle="Harmonization progress, coverage and procurement intelligence">
                <Dashboard />
              </Shell>
            }
          />
          <Route
            path="/admin"
            element={
              <Shell title="Admin Console" subtitle="Reference data · migration · audit chain · users">
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
