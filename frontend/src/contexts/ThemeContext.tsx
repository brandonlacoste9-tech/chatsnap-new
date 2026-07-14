import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTheme,
  loadEdgeMode,
  loadPaletteId,
  type EdgeMode,
  type PaletteId,
} from "@/lib/theme";

type ThemeValue = {
  paletteId: PaletteId;
  edgeMode: EdgeMode;
  setPaletteId: (id: PaletteId) => void;
  setEdgeMode: (mode: EdgeMode) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteState] = useState<PaletteId>(() =>
    typeof window !== "undefined" ? loadPaletteId() : "sunny",
  );
  const [edgeMode, setEdgeState] = useState<EdgeMode>(() =>
    typeof window !== "undefined" ? loadEdgeMode() : "soft",
  );

  useEffect(() => {
    applyTheme(paletteId, edgeMode);
  }, [paletteId, edgeMode]);

  const setPaletteId = useCallback((id: PaletteId) => {
    setPaletteState(id);
  }, []);

  const setEdgeMode = useCallback((mode: EdgeMode) => {
    setEdgeState(mode);
  }, []);

  const value = useMemo(
    () => ({ paletteId, edgeMode, setPaletteId, setEdgeMode }),
    [paletteId, edgeMode, setPaletteId, setEdgeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
