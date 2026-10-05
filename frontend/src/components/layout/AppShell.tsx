import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Database,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { Role } from "../../lib/types";
import { useAuth, registerNavigate } from "../../state/AuthContext";
import { cn } from "../../lib/format";
import { Kbd } from "../ui/Primitives";

// Brand mark: the four attribute states as identity. No decoration beyond meaning.
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="4" y="4" width="11" height="11" rx="3" fill="#15803D" />
      <rect x="17" y="4" width="11" height="11" rx="3" fill="#B42318" />
      <rect x="4" y="17" width="11" height="11" rx="3" fill="#B45309" />
      <rect x="17" y="17" width="11" height="11" rx="3" fill="#A29B92" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Role[] | "all";
  end?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Workspace",
    items: [
      {
        to: "/portal",
        label: "CPSE Portal",
        icon: <LayoutGrid className="w-[17px] h-[17px]" />,
        roles: ["UPLOADER", "ADMIN"],
      },
      {
        to: "/workbench",
        label: "Steward Workbench",
        icon: <ShieldCheck className="w-[17px] h-[17px]" />,
        roles: ["STEWARD", "APPROVER", "ADMIN"],
      },
      {
        to: "/golden",
        label: "Golden Records",
        icon: <Database className="w-[17px] h-[17px]" />,
        roles: "all",
      },
    ],
  },
  {
    section: "Insights",
    items: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: <BarChart3 className="w-[17px] h-[17px]" />,
        roles: "all",
      },
    ],
  },
  {
    section: "Governance",
    items: [
      {
        to: "/admin",
        label: "Admin Console",
        icon: <Users className="w-[17px] h-[17px]" />,
        roles: ["ADMIN", "AUDITOR"],
      },
    ],
  },
];

const ROLE_HOME: Record<Role, string> = {
  UPLOADER: "/portal",
  STEWARD: "/workbench",
  APPROVER: "/workbench",
  ADMIN: "/admin",
  AUDITOR: "/admin",
};

export const roleHome = ROLE_HOME;

export default function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");

  // Register navigate so AuthContext.switchRole can redirect without
  // depending on react-router hooks directly.
  useEffect(() => {
    registerNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  if (!user) return null;
  const role = user.role;

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <BrandMark />
        <div className="leading-tight">
          <div className="text-[13.5px] font-bold text-ink tracking-tight">Material Identity</div>
          <div className="text-[10px] uppercase tracking-label text-ink-3 font-semibold">National Platform</div>
        </div>
      </div>

      <div className="flex-1 px-3 space-y-6 overflow-y-auto">
        {NAV.map((group) => {
          const items = group.items.filter(
            (i) => i.roles === "all" || (i.roles as Role[]).includes(role),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.section}>
              <div className="label !text-[9.5px] px-2.5 mb-2">{group.section}</div>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-2.5 h-9 rounded-control text-[13px] font-semibold transition-all duration-150",
                        isActive
                          ? "bg-ink text-paper shadow-[0_1px_2px_rgba(26,24,21,0.2)]"
                          : "text-ink-2 hover:bg-surface-3 hover:text-ink",
                      )
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-2.5 rounded-control px-2.5 py-2">
          <div className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center text-[11px] font-bold">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[12.5px] font-semibold text-ink truncate">{user.username}</div>
            <div className="text-[10px] uppercase tracking-label text-ink-3 font-semibold">{role}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="ml-auto btn-ghost !h-8 !w-8 !p-0 rounded-full"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 w-[236px] bg-surface border-r border-line hidden lg:block z-40">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          <div className="absolute inset-0 bg-ink/25" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[264px] bg-surface shadow-pop animate-fade-up">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[236px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 px-4 sm:px-7 h-[60px]">
            <button
              className="btn-ghost !h-9 !w-9 !p-0 rounded-control lg:hidden"
              onClick={() => setDrawer((d) => !d)}
              aria-label="Menu"
            >
              {drawer ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
            </button>
            <div className="min-w-0">
              <h1 className="text-[15.5px] font-bold text-ink tracking-tight leading-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-[11px] text-ink-2 leading-tight truncate hidden sm:block">{subtitle}</p>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              {/* Global search */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(`/golden?q=${encodeURIComponent(q)}`);
                }}
                className="relative hidden md:block"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search CMC, CPSE code…"
                  className="input !py-[7px] !pl-9 !pr-12 !text-[12.5px] w-[230px] lg:w-[280px] bg-surface"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-ink-3">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </form>

              {/* Demo mode chip + role switcher */}
              <div className="flex items-center gap-1 rounded-control border border-unknown/40 bg-unknown-bg px-1.5 h-8">
                <Sparkles className="w-3 h-3 text-unknown" />
                <span className="text-[9.5px] font-bold uppercase tracking-label text-unknown hidden sm:inline">
                  Demo
                </span>
                <select
                  aria-label="Switch demo role"
                  value={role}
                  onChange={(e) => switchRole(e.target.value as Role)}
                  className="bg-transparent text-[11px] font-semibold text-ink cursor-pointer outline-none"
                >
                  {(["UPLOADER", "STEWARD", "APPROVER", "ADMIN", "AUDITOR"] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {r.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-7 py-6 max-w-[1360px] mx-auto animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
