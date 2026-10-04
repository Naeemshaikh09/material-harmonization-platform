import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useToast } from "../state/ToastContext";
import { BrandMark, roleHome } from "../components/layout/AppShell";
import type { Role } from "../lib/types";
import { ApiError } from "../lib/api";
import { Kbd } from "../components/ui/Primitives";

const DEMO: { role: Role; user: string; blurb: string }[] = [
  { role: "UPLOADER", user: "uploader1", blurb: "CPSE catalogues · search-before-create" },
  { role: "STEWARD", user: "steward1", blurb: "Match review · L1 decisions" },
  { role: "APPROVER", user: "approver1", blurb: "L2 sign-off · functional equivalence" },
  { role: "ADMIN", user: "admin1", blurb: "Templates, migration, users" },
  { role: "AUDITOR", user: "auditor1", blurb: "Hash-chained audit · verify" },
];

export default function Login() {
  const { login } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const doLogin = async (u: string, p: string, key: string) => {
    setBusy(key);
    try {
      const user = await login(u, p);
      navigate(roleHome[user.role]);
    } catch (e) {
      error(e instanceof ApiError ? e.message : "Sign-in failed", "Use one of the demo accounts below.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---- Brand panel: warm ink, the four states as the identity mark ---- */}
      <aside className="relative hidden lg:flex flex-col justify-between bg-ink text-paper p-12 overflow-hidden">
        {/* quiet dot grid — engineering notebook, not decoration */}
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #FAF9F7 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <BrandMark size={30} />
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">National Material Identity Platform</div>
            <div className="text-[10.5px] uppercase tracking-label text-paper/55 font-semibold">
              SIH 26099 · one material, one identity
            </div>
          </div>
        </div>

        <div className="relative max-w-[430px]">
          <h1 className="text-[42px] leading-[1.06] font-bold tracking-[-0.02em]">
            Every CPSE gives the same valve
            <br />
            a different code.
            <br />
            <span className="text-paper/60">Not anymore.</span>
          </h1>
          <p className="text-[14px] leading-relaxed text-paper/70 mt-5">
            Messy descriptions become one canonical attribute set, one Common Material Code,
            and a crosswalk that never touches your existing codes.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { c: "#4ADE80", t: "MATCH — link with evidence", s: "Attribute-by-attribute, never by guess" },
              { c: "#F87171", t: "CONFLICT — keep separate", s: "A wrong merge is worse than a duplicate" },
              { c: "#FBBF24", t: "UNKNOWN — ask a human", s: "Missing is acceptable; silent is not" },
            ].map((r) => (
              <div key={r.t} className="flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ background: r.c }} />
                <div>
                  <div className="text-[13px] font-semibold">{r.t}</div>
                  <div className="text-[11.5px] text-paper/55">{r.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-paper/45">
          <Lock className="w-3.5 h-3.5" />
          Demo environment · synthetic procurement data · SAP/Oracle mocked
        </div>
      </aside>

      {/* ---- Sign in ---- */}
      <main className="flex items-center justify-center p-6 sm:p-12 bg-paper">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <BrandMark size={28} />
            <div className="text-[13px] font-bold leading-tight">
              National Material
              <br />
              Identity Platform
            </div>
          </div>

          <h2 className="text-[24px] font-bold tracking-tight text-ink">Sign in</h2>
          <p className="text-[13px] text-ink-2 mt-1.5">
            Role-based access — uploaders see only their CPSE.
          </p>

          <form
            className="mt-6 space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              doLogin(username, password, "form");
            }}
          >
            <div>
              <label className="label !text-[10px] block mb-1.5" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="input"
                placeholder="uploader1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label !text-[10px] block mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={busy !== null || !username}
              className="btn-primary w-full !h-11"
            >
              {busy === "form" ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[10.5px] uppercase tracking-label text-ink-3 font-semibold">
              demo accounts — one click
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2">
            {DEMO.map((d) => (
              <button
                key={d.user}
                disabled={busy !== null}
                onClick={() => doLogin(d.user, "demo", d.user)}
                className="w-full flex items-center gap-3 rounded-control border border-line bg-surface px-3.5 py-2.5
                  text-left transition-all duration-150 hover:border-ink/35 hover:shadow-card hover:-translate-y-px
                  disabled:opacity-50 focus-ring group"
              >
                <span className="w-8 h-8 rounded-full bg-surface-3 text-ink flex items-center justify-center">
                  {busy === d.user ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-ink-2" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-ink">
                    {d.role}
                    <span className="text-ink-3 font-medium ml-2">{d.user}</span>
                  </span>
                  <span className="block text-[11px] text-ink-2 truncate">{d.blurb}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-ink-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          <p className="text-[11px] text-ink-3 mt-6 leading-relaxed">
            Any password works in demo mode. Built by developer3 · UI lead.
            Shortcut: <Kbd>⌘</Kbd> <Kbd>K</Kbd> jumps to search.
          </p>
        </div>
      </main>
    </div>
  );
}
