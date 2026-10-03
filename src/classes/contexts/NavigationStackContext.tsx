import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";

export type NavigationTarget = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

export type ActivityType =
  | "impersonation.select"
  | "tutor.details"
  | "tutor.edit"
  | "tutor.create"
  | "animal.details"
  | "animal.edit"
  | "animal.create";

export type ActivityDescriptor = {
  type: ActivityType;
  resourceId?: string;
  payload?: Record<string, unknown>;
};

export type NavigationFrame = {
  id: string;
  destinationPathname: string;
  returnTarget: NavigationTarget;
  activity?: ActivityDescriptor;
};

type NavigateWithReturnOptions = {
  state?: Record<string, unknown>;
  replace?: boolean;
  returnTarget?: NavigationTarget;
};

type NavigationStackContextValue = {
  depth: number;
  hasReturn: boolean;
  frames: readonly NavigationFrame[];
  navigateWithReturn: (pathname: string, options?: NavigateWithReturnOptions) => string;
  beginLocalActivity: (destinationPathname: string, returnTarget?: NavigationTarget) => string;
  openActivity: (activity: ActivityDescriptor, returnTarget?: NavigationTarget) => string;
  closeActivityFrame: (activityId: string) => void;
  endLocalActivity: (activityId: string) => void;
  returnToPrevious: (fallbackPathname: string, fallbackState?: unknown) => boolean;
  closeActivity: (fallbackPathname: string) => boolean;
  clearNavigationStack: () => void;
};

const storageKey = "kahu.navigationStack";
const frameStateKey = "navigationFrameId";
const NavigationStackContext = createContext<NavigationStackContextValue | null>(null);
const nextFrameId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readFrames = (): NavigationFrame[] => {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const stateFrameId = (state: unknown): string => {
  if (!state || typeof state !== "object") return "";
  const value = (state as Record<string, unknown>)[frameStateKey];
  return typeof value === "string" ? value : "";
};

const targetMatches = (target: NavigationTarget, pathname: string, search: string, hash: string) =>
  target.pathname === pathname &&
  (target.search ?? "") === search &&
  (target.hash ?? "") === hash;

export function NavigationStackProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [frames, setFrames] = useState<NavigationFrame[]>(readFrames);
  const framesRef = useRef(frames);
  const visitedFramesRef = useRef(new Set<string>());

  const updateFrames = useCallback((next: NavigationFrame[]) => {
    framesRef.current = next;
    setFrames(next);
    if (next.length) sessionStorage.setItem(storageKey, JSON.stringify(next));
    else sessionStorage.removeItem(storageKey);
  }, []);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    if (!location.pathname.startsWith("/home")) {
      updateFrames([]);
      visitedFramesRef.current.clear();
      return;
    }

    const currentFrameId = stateFrameId(location.state);
    if (currentFrameId) visitedFramesRef.current.add(currentFrameId);

    const current = framesRef.current;
    const top = current.at(-1);
    const returningFromTop =
      top &&
      top.id !== currentFrameId &&
      visitedFramesRef.current.has(top.id);

    if (returningFromTop && targetMatches(top.returnTarget, location.pathname, location.search, location.hash)) {
      visitedFramesRef.current.delete(top.id);
      updateFrames(current.slice(0, -1));
      return;
    }

    if (returningFromTop && navigationType === "POP") {
      visitedFramesRef.current.delete(top.id);
      updateFrames(current.slice(0, -1));
      navigate(
        {
          pathname: top.returnTarget.pathname,
          search: top.returnTarget.search,
          hash: top.returnTarget.hash,
        },
        { replace: true, state: top.returnTarget.state },
      );
    }
  }, [location.hash, location.pathname, location.search, location.state, navigate, navigationType, updateFrames]);

  const navigateWithReturn = useCallback((pathname: string, options: NavigateWithReturnOptions = {}) => {
    const id = nextFrameId();
    const explicitReturn = options.returnTarget;
    const locationState = location.state && typeof location.state === "object"
      ? location.state as Record<string, unknown>
      : {};
    const explicitState = explicitReturn?.state && typeof explicitReturn.state === "object"
      ? explicitReturn.state as Record<string, unknown>
      : {};
    const frame: NavigationFrame = {
      id,
      destinationPathname: pathname,
      returnTarget: explicitReturn
        ? {
            ...explicitReturn,
            state: { ...locationState, ...explicitState },
          }
        : {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            state: location.state,
          },
    };
    updateFrames([...framesRef.current, frame]);
    navigate(pathname, {
      replace: options.replace,
      state: { ...(options.state ?? {}), [frameStateKey]: id },
    });
    return id;
  }, [location.hash, location.pathname, location.search, location.state, navigate, updateFrames]);

  const beginLocalActivity = useCallback((destinationPathname: string, returnTarget?: NavigationTarget) => {
    const id = nextFrameId();
    const frame: NavigationFrame = {
      id,
      destinationPathname,
      returnTarget: returnTarget ?? {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
      },
    };
    updateFrames([...framesRef.current, frame]);
    visitedFramesRef.current.add(id);
    return id;
  }, [location.hash, location.pathname, location.search, location.state, updateFrames]);

  const openActivity = useCallback((activity: ActivityDescriptor, returnTarget?: NavigationTarget) => {
    const id = nextFrameId();
    const frame: NavigationFrame = {
      id,
      destinationPathname: `/activity/${activity.type}${activity.resourceId ? `/` + activity.resourceId : ""}`,
      returnTarget: returnTarget ?? {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
      },
      activity,
    };
    updateFrames([...framesRef.current, frame]);
    visitedFramesRef.current.add(id);
    return id;
  }, [location.hash, location.pathname, location.search, location.state, updateFrames]);

  const endLocalActivity = useCallback((activityId: string) => {
    const current = framesRef.current;
    const frameIndex = current.map((frame) => frame.id).lastIndexOf(activityId);
    if (frameIndex < 0) return;
    visitedFramesRef.current.delete(activityId);
    updateFrames(current.filter((_, index) => index !== frameIndex));
  }, [updateFrames]);

  const closeActivityFrame = endLocalActivity;

  const returnToPrevious = useCallback((fallbackPathname: string, fallbackState?: unknown) => {
    const currentFrameId = stateFrameId(location.state);
    const current = framesRef.current;
    const frameIndex = currentFrameId
      ? current.map((frame) => frame.id).lastIndexOf(currentFrameId)
      : -1;

    if (frameIndex < 0) {
      navigate(fallbackPathname, { replace: true, state: fallbackState });
      return false;
    }

    const frame = current[frameIndex];
    updateFrames(current.slice(0, frameIndex));
    visitedFramesRef.current.delete(frame.id);
    navigate(
      {
        pathname: frame.returnTarget.pathname,
        search: frame.returnTarget.search,
        hash: frame.returnTarget.hash,
      },
      { replace: true, state: frame.returnTarget.state },
    );
    return true;
  }, [location.state, navigate, updateFrames]);

  const clearNavigationStack = useCallback(() => {
    visitedFramesRef.current.clear();
    updateFrames([]);
  }, [updateFrames]);

  const closeActivity = useCallback((fallbackPathname: string) => {
    const currentFrameId = stateFrameId(location.state);
    if (currentFrameId && framesRef.current.some((frame) => frame.id === currentFrameId)) {
      return returnToPrevious(fallbackPathname);
    }

    clearNavigationStack();
    const currentHistoryState =
      window.history.state && typeof window.history.state === "object"
        ? window.history.state as Record<string, unknown>
        : {};
    window.history.replaceState({ ...currentHistoryState, usr: null }, "", fallbackPathname);
    return false;
  }, [clearNavigationStack, location.state, returnToPrevious]);

  const currentFrameId = stateFrameId(location.state);
  const value = useMemo<NavigationStackContextValue>(() => ({
    depth: frames.length,
    hasReturn: Boolean(currentFrameId && frames.some((frame) => frame.id === currentFrameId)),
    frames,
    navigateWithReturn,
    beginLocalActivity,
    openActivity,
    closeActivityFrame,
    endLocalActivity,
    returnToPrevious,
    closeActivity,
    clearNavigationStack,
  }), [beginLocalActivity, clearNavigationStack, closeActivity, closeActivityFrame, currentFrameId, endLocalActivity, frames, navigateWithReturn, openActivity, returnToPrevious]);

  return <NavigationStackContext.Provider value={value}>{children}</NavigationStackContext.Provider>;
}

export function useNavigationStack() {
  const context = useContext(NavigationStackContext);
  if (!context) throw new Error("useNavigationStack must be used inside NavigationStackProvider");
  return context;
}
