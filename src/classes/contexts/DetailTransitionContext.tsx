import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";

type DetailTransitionContextValue = {
  active: boolean;
  leaving: boolean;
  beginDetailTransition: () => string;
  completeDetailTransition: (id?: string) => void;
};

const DetailTransitionContext = createContext<DetailTransitionContextValue | null>(null);

const nextTransitionId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function DetailTransitionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const currentIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const beginDetailTransition = useCallback(() => {
    const id = nextTransitionId();
    currentIdRef.current = id;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setLeaving(false);
    setActive(true);
    return id;
  }, []);

  const completeDetailTransition = useCallback((id?: string) => {
    if (id && currentIdRef.current && currentIdRef.current !== id) return;

    currentIdRef.current = null;
    setLeaving(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setActive(false);
      setLeaving(false);
      timeoutRef.current = null;
    }, 220);
  }, []);

  return (
    <DetailTransitionContext.Provider value={{ active, leaving, beginDetailTransition, completeDetailTransition }}>
      {children}
    </DetailTransitionContext.Provider>
  );
}

export function useDetailTransition() {
  const context = useContext(DetailTransitionContext);

  if (!context) {
    throw new Error("useDetailTransition must be used inside DetailTransitionProvider");
  }

  return context;
}
