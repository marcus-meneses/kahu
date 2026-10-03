import { useSyncExternalStore } from "react";

export type TomaConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export type TomaDiagnosticsSnapshot = {
  status: TomaConnectionStatus;
  socketUrl: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  reconnectAttempt: number;
  lastError: string | null;
  lastMessage: unknown | null;
  lastMessageAt: string | null;
};

let snapshot: TomaDiagnosticsSnapshot = {
  status: "idle",
  socketUrl: null,
  connectedAt: null,
  disconnectedAt: null,
  reconnectAttempt: 0,
  lastError: null,
  lastMessage: null,
  lastMessageAt: null,
};
const listeners = new Set<() => void>();

export const updateTomaDiagnostics = (change: Partial<TomaDiagnosticsSnapshot>) => {
  snapshot = { ...snapshot, ...change };
  listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useTomaDiagnostics = () => useSyncExternalStore(subscribe, () => snapshot);
