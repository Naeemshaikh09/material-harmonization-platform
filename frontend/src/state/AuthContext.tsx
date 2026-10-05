import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Role, User } from "../lib/types";
import { api, setToken } from "../lib/api";

const ROLE_HOME: Record<Role, string> = {
  UPLOADER: "/portal",
  STEWARD: "/workbench",
  APPROVER: "/workbench",
  ADMIN: "/admin",
  AUDITOR: "/admin",
};

interface AuthState {
  user: User | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  switchRole: (role: Role) => void; // demo affordance
}

const Ctx = createContext<AuthState | null>(null);

// Navigation callback registered by AppShell so AuthContext can trigger
// navigation without depending on react-router directly.
let _navigate: ((path: string) => void) | null = null;
export function registerNavigate(fn: (path: string) => void) {
  _navigate = fn;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("nmip_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });

  const persist = useCallback((u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem("nmip_user", JSON.stringify(u));
    else localStorage.removeItem("nmip_user");
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const r = await api.login(username, password);
      persist(r.user);
      return r.user;
    },
    [persist],
  );

  const logout = useCallback(() => {
    setToken(null);
    persist(null);
  }, [persist]);

  const switchRole = useCallback(
    (role: Role) => {
      if (!user) return;
      const updated: User = { ...user, role, username: role.toLowerCase() + "1" };
      persist(updated);
      // Navigate to the new role's home so we never land on a forbidden route.
      _navigate?.(ROLE_HOME[role]);
    },
    [user, persist],
  );

  const value = useMemo(() => ({ user, login, logout, switchRole }), [user, login, logout, switchRole]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
