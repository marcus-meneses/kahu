import { createContext, ReactNode, useMemo, useState } from "react";
import { ClientRoutePermission, setEffectiveZealRoutes, setRealZealRoutes } from "../utils/permissionRegistry";

export type KahuRoutePermission = ClientRoutePermission;
interface RoutePermissionContextValue {
  routes: KahuRoutePermission[] | null;
  realRoutes: KahuRoutePermission[] | null;
  zealRoutes: KahuRoutePermission[] | null;
  realZealRoutes: KahuRoutePermission[] | null;
  setRoutes: (routes: KahuRoutePermission[] | null) => void;
  setRealRoutes: (routes: KahuRoutePermission[] | null) => void;
  setZealRoutes: (routes: KahuRoutePermission[] | null) => void;
  setRealZealRoutes: (routes: KahuRoutePermission[] | null) => void;
  canAccess: (path: string, method?: string) => boolean;
  canPerform: (operation: string) => boolean;
  realCanPerform: (operation: string) => boolean;
  canUseApi: (method: string, path: string) => boolean;
}
const normalize = (value: string) => value.length > 1 ? value.replace(/\/+$/, "") : value;
export const routeMatches = (pattern: string, value: string) => {
  const expected = normalize(pattern).split("/").filter(Boolean), actual = normalize(value).split("/").filter(Boolean);
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] === "*") return true;
    if (actual[index] === undefined) return false;
    if (!expected[index].startsWith(":") && expected[index] !== actual[index]) return false;
  }
  return expected.length === actual.length;
};
export const RoutePermissionContext = createContext<RoutePermissionContextValue | null>(null);
export function RoutePermissionProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<KahuRoutePermission[] | null>(null);
  const [realRoutes, setRealRoutes] = useState<KahuRoutePermission[] | null>(null);
  const [zealRoutes, setStoredZealRoutes] = useState<KahuRoutePermission[] | null>(null);
  const [realZealRoutes, setStoredRealZealRoutes] = useState<KahuRoutePermission[] | null>(null);
  const updateZealRoutes = (next: KahuRoutePermission[] | null) => { setEffectiveZealRoutes(next); setStoredZealRoutes(next); };
  const updateRealZealRoutes = (next: KahuRoutePermission[] | null) => { setRealZealRoutes(next); setStoredRealZealRoutes(next); };
  const value = useMemo(() => ({
    routes, realRoutes, zealRoutes, realZealRoutes, setRoutes, setRealRoutes,
    setZealRoutes: updateZealRoutes, setRealZealRoutes: updateRealZealRoutes,
    canAccess: (path: string, method = "GET") => Boolean(routes?.some((route) => route.method === method && routeMatches(route.path, path))),
    canPerform: (operation: string) => Boolean(routes?.some((route) => route.operation === operation)),
    realCanPerform: (operation: string) => Boolean(realRoutes?.some((route) => route.operation === operation)),
    canUseApi: (method: string, path: string) => Boolean(zealRoutes?.some((route) => route.method === method.toUpperCase() && routeMatches(route.path, path))),
  }), [realRoutes, realZealRoutes, routes, zealRoutes]);
  return <RoutePermissionContext.Provider value={value}>{children}</RoutePermissionContext.Provider>;
}
