import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

type ModuleStateMap = Record<string, unknown>;
type StateUpdater<T> = T | ((current: T) => T);

interface ModuleStateContextValue {
  states: ModuleStateMap;
  setModuleState: <T>(key: string, updater: StateUpdater<T>) => void;
}

const storageKey = "kahu.moduleState";
const ModuleStateContext = createContext<ModuleStateContextValue | null>(null);

const loadStoredState = (): ModuleStateMap => {
  try {
    const stored = sessionStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as ModuleStateMap) : {};
  } catch {
    return {};
  }
};

export function ModuleStateProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<ModuleStateMap>(loadStoredState);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(states));
  }, [states]);

  const setModuleState = useCallback(<T,>(key: string, updater: StateUpdater<T>) => {
    setStates((current) => {
      const currentValue = current[key] as T;
      const nextValue = typeof updater === "function"
        ? (updater as (value: T) => T)(currentValue)
        : updater;

      return { ...current, [key]: nextValue };
    });
  }, []);

  return (
    <ModuleStateContext.Provider value={{ states, setModuleState }}>
      {children}
    </ModuleStateContext.Provider>
  );
}

export function useModuleState<T>(key: string, initialState: T): [T, (updater: StateUpdater<T>) => void] {
  const context = useContext(ModuleStateContext);

  if (!context) {
    throw new Error("useModuleState must be used inside ModuleStateProvider");
  }

  return [
    (context.states[key] as T | undefined) ?? initialState,
    (updater: StateUpdater<T>) => context.setModuleState<T>(key, updater),
  ];
}
