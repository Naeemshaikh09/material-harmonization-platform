import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

interface ToastState {
  push: (kind: ToastKind, title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  success: (title: string, body?: string) => void;
}

const Ctx = createContext<ToastState | null>(null);
let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = seq++;
    setToasts((t) => [...t, { id, kind, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6500 : 4200);
  }, []);

  const value = useMemo(
    () => ({
      push,
      error: (t: string, b?: string) => push("error", t, b),
      success: (t: string, b?: string) => push("success", t, b),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Error toast stack — fixed bottom-right, never covers content */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-2.5rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className="card shadow-pop border-l-[3px] animate-fade-up px-4 py-3 flex gap-3 items-start"
            style={{
              borderLeftColor: t.kind === "error" ? "#B42318" : t.kind === "success" ? "#15803D" : "#1A1815",
            }}
          >
            <div className="mt-0.5">
              {t.kind === "error" ? (
                <XCircle className="w-[18px] h-[18px] text-conflict" />
              ) : t.kind === "success" ? (
                <CheckCircle2 className="w-[18px] h-[18px] text-match" />
              ) : (
                <Info className="w-[18px] h-[18px] text-ink" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink leading-snug">{t.title}</p>
              {t.body && <p className="text-[12.5px] text-ink-2 leading-snug mt-0.5">{t.body}</p>}
            </div>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="ml-auto text-ink-3 hover:text-ink transition-colors"
              aria-label="Dismiss"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast outside ToastProvider");
  return v;
}
