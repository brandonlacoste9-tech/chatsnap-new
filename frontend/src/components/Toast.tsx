import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "ok" | "err" | "info";

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
};

type ToastApi = {
  toast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let idSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = idSeq++;
    setItems((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 12,
          right: 12,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
          alignItems: "center",
        }}
      >
        {items.map((t) => (
          <div
            key={t.id}
            style={{
              maxWidth: 360,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 14,
              textAlign: "center",
              background:
                t.kind === "ok"
                  ? "#12361f"
                  : t.kind === "err"
                    ? "#3a1218"
                    : "#1a1a1a",
              border: `1px solid ${
                t.kind === "ok"
                  ? "#3dff9a"
                  : t.kind === "err"
                    ? "#ff4d6d"
                    : "#fffc00"
              }`,
              color: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside provider");
  return ctx;
}
