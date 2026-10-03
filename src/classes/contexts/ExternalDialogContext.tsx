import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { SecondaryModal } from "../../components/activity/ActivityModal";

export type ExternalDialogControls<T> = {
  resolve: (value: T) => void;
  cancel: () => void;
};

type DialogRenderer<T> = (controls: ExternalDialogControls<T>) => ReactNode;
type QueuedDialog = {
  id: string;
  title: ReactNode;
  size?: string | number;
  render: DialogRenderer<unknown>;
  resolve: (value: unknown | null) => void;
};

type ExternalDialogContextValue = {
  open: <T>(options: { title: ReactNode; size?: string | number; render: DialogRenderer<T> }) => Promise<T | null>;
};

const ExternalDialogContext = createContext<ExternalDialogContextValue | null>(null);

export function ExternalDialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<QueuedDialog | null>(null);
  const currentRef = useRef<QueuedDialog | null>(null);
  const queue = useRef<QueuedDialog[]>([]);

  const advance = useCallback(() => {
    const next = queue.current.shift() ?? null;
    currentRef.current = next;
    setCurrent(next);
  }, []);

  const finish = useCallback((value: unknown | null) => {
    const active = currentRef.current;
    if (!active) return;
    active.resolve(value);
    advance();
  }, [advance]);

  const open = useCallback(<T,>(options: { title: ReactNode; size?: string | number; render: DialogRenderer<T> }) =>
    new Promise<T | null>((resolve) => {
      const dialog: QueuedDialog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: options.title,
        size: options.size,
        render: options.render as DialogRenderer<unknown>,
        resolve: resolve as (value: unknown | null) => void,
      };
      if (currentRef.current) queue.current.push(dialog);
      else {
        currentRef.current = dialog;
        setCurrent(dialog);
      }
    }), []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ExternalDialogContext.Provider value={value}>
      {children}
      <SecondaryModal
        opened={Boolean(current)}
        onClose={() => finish(null)}
        title={current?.title}
        size={current?.size ?? "lg"}
        layer={9000}
        centered
      >
        {current?.render({ resolve: (result) => finish(result), cancel: () => finish(null) })}
      </SecondaryModal>
    </ExternalDialogContext.Provider>
  );
}

export function useExternalDialog() {
  const value = useContext(ExternalDialogContext);
  if (!value) throw new Error("useExternalDialog must be used inside ExternalDialogProvider");
  return value;
}
