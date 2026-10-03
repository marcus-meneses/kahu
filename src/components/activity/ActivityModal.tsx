import {
  createContext,
  MutableRefObject,
  ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button, Group, LoadingOverlay, Modal, Stack, Text } from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import { useI18n } from "../../i18n/I18nContext";

export type ActivityModalProps = Omit<ModalProps, "zIndex"> & {
  layer?: number;
  zIndex?: number;
  ready?: boolean;
  onResume?: () => void | Promise<void>;
  dirty?: boolean;
};

type RegisteredActivity = {
  id: string;
  order: number;
  props: MutableRefObject<ActivityModalProps>;
};

type ActivityModalContextValue = {
  activeId: string | null;
  contentRoot: HTMLDivElement | null;
  register: (entry: RegisteredActivity) => void;
  unregister: (id: string) => void;
  setLoading: (id: string, loading: boolean) => void;
  requestDiscard: (action: () => void) => void;
};

const ActivityModalContext = createContext<ActivityModalContextValue | null>(null);
let registrationOrder = 0;
const activityModalZIndex = 1200;
const secondaryModalZIndex = 1400;

const layerOf = (props: ActivityModalProps) => props.layer ?? props.zIndex ?? 200;

export function SecondaryModal({ layer, zIndex, closeOnClickOutside = false, keepMounted = true, ...props }: ActivityModalProps) {
  return (
    <Modal
      {...props}
      zIndex={Math.max(secondaryModalZIndex, layer ?? 0, zIndex ?? 0)}
      keepMounted={keepMounted}
      closeOnClickOutside={closeOnClickOutside}
    />
  );
}

export function ActivityModalProvider({
  activityCount,
  children,
  onDismiss,
}: {
  activityCount: number;
  children: ReactNode;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<RegisteredActivity[]>([]);
  const [contentRoot, setContentRoot] = useState<HTMLDivElement | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);

  const register = useMemo(() => (entry: RegisteredActivity) => {
    setEntries((current) => current.some((known) => known.id === entry.id) ? current : [...current, entry]);
  }, []);
  const unregister = useMemo(() => (id: string) => {
    setEntries((current) => current.some((entry) => entry.id === id) ? current.filter((entry) => entry.id !== id) : current);
    setLoadingIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);
  const setLoading = useMemo(() => (id: string, loading: boolean) => {
    setLoadingIds((current) => {
      if (current.has(id) === loading) return current;
      const next = new Set(current);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const active = entries.reduce<RegisteredActivity | null>((selected, entry) => {
    if (!selected) return entry;
    const layerDifference = layerOf(entry.props.current) - layerOf(selected.props.current);
    return layerDifference > 0 || (layerDifference === 0 && entry.order > selected.order) ? entry : selected;
  }, null);
  const activeProps = active?.props.current;
  const requestDiscard = (action: () => void) => {
    if (active?.props.current.dirty) setDiscardAction(() => action);
    else action();
  };
  const loading = activityCount > entries.length || Boolean(active && loadingIds.has(active.id));
  const {
    children: _content,
    layer: _layer,
    zIndex: _zIndex,
    ready: _ready,
    onResume: _onResume,
    dirty: _dirty,
    opened: _opened,
    onClose: _onClose,
    closeOnClickOutside: _closeOnClickOutside,
    keepMounted = true,
    ...modalProps
  } = activeProps ?? {};

  const context = useMemo<ActivityModalContextValue>(() => ({
    activeId: active?.id ?? null,
    contentRoot,
    register,
    unregister,
    setLoading,
    requestDiscard,
  }), [active?.id, contentRoot, register, setLoading, unregister]);

  return (
    <ActivityModalContext.Provider value={context}>
      {children}
      <Modal
        size="lg"
        centered
        {...modalProps}
        opened={Boolean(active) || loading}
        onClose={() => requestDiscard(onDismiss)}
        zIndex={activityModalZIndex}
        keepMounted={keepMounted}
        closeOnClickOutside
      >
        <div
          style={{
            minHeight: loading && !active ? "min(600px, calc(100dvh - 160px))" : undefined,
            position: "relative",
          }}
        >
          <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ blur: 1 }} />
          <div ref={setContentRoot} />
        </div>
      </Modal>
      <SecondaryModal opened={Boolean(discardAction)} onClose={() => setDiscardAction(null)} title={t("common.unsaved.title")} size="sm" centered zIndex={12000}>
        <Stack gap="md">
          <Text>{t("common.unsaved.message")}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="light.1" onClick={() => setDiscardAction(null)}>{t("common.actions.cancel")}</Button>
            <Button color="red" onClick={() => { const action = discardAction; setDiscardAction(null); action?.(); }}>{t("common.actions.discard")}</Button>
          </Group>
        </Stack>
      </SecondaryModal>
    </ActivityModalContext.Provider>
  );
}

export function ActivityModal(props: ActivityModalProps) {
  const context = useContext(ActivityModalContext);
  if (!context) throw new Error("ActivityModal must be used inside ActivityModalProvider");

  const id = useId();
  const propsRef = useRef(props);
  propsRef.current = props;
  const orderRef = useRef(0);
  const activatedRef = useRef(false);
  const wasActiveRef = useRef(false);
  if (!orderRef.current) orderRef.current = ++registrationOrder;

  useLayoutEffect(() => {
    if (!props.opened || props.ready === false) {
      context.unregister(id);
      return;
    }

    let promotionFrame = 0;
    const preparationFrame = window.requestAnimationFrame(() => {
      promotionFrame = window.requestAnimationFrame(() => {
        context.register({ id, order: orderRef.current, props: propsRef });
      });
    });

    return () => {
      window.cancelAnimationFrame(preparationFrame);
      if (promotionFrame) window.cancelAnimationFrame(promotionFrame);
      context.unregister(id);
    };
  }, [context.register, context.unregister, id, props.opened, props.ready]);

  const active = context.activeId === id;
  useEffect(() => {
    if (active && !wasActiveRef.current) {
      if (activatedRef.current && propsRef.current.onResume) {
        context.setLoading(id, true);
        void Promise.resolve()
          .then(() => propsRef.current.onResume?.())
          .catch(() => undefined)
          .finally(() => context.setLoading(id, false));
      }
      activatedRef.current = true;
    }
    wasActiveRef.current = active;
  }, [active, context.setLoading, id]);

  if (!active || !context.contentRoot) return null;
  return createPortal(props.children, context.contentRoot);
}

export function useActivityDiscardGuard() {
  const context = useContext(ActivityModalContext);
  if (!context) throw new Error("useActivityDiscardGuard must be used inside ActivityModalProvider");
  return context.requestDiscard;
}
