export interface ClientRoutePermission {
  method: string;
  path: string;
  operation: string;
  section: string;
}

let effectiveZealRoutes: ClientRoutePermission[] | null = null;
let realZealRoutes: ClientRoutePermission[] | null = null;
const normalize = (value: string) => {
  const path = value.split("?")[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
};
const matches = (pattern: string, value: string) => {
  const expected = normalize(pattern).split("/").filter(Boolean);
  const actual = normalize(value).split("/").filter(Boolean);
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] === "*") return true;
    if (actual[index] === undefined) return false;
    if (!expected[index].startsWith(":") && expected[index] !== actual[index]) return false;
  }
  return expected.length === actual.length;
};
const findRoute = (routes: ClientRoutePermission[] | null, method: string, path: string) => routes?.find((route) => route.method === method.toUpperCase() && matches(route.path, path));
export const setEffectiveZealRoutes = (routes: ClientRoutePermission[] | null) => { effectiveZealRoutes = routes; };
export const setRealZealRoutes = (routes: ClientRoutePermission[] | null) => { realZealRoutes = routes; };
export const findEffectiveZealRoute = (method: string, path: string) => findRoute(effectiveZealRoutes, method, path);
export const findRealZealRoute = (method: string, path: string) => findRoute(realZealRoutes, method, path);
export const hasEffectiveZealMap = () => effectiveZealRoutes !== null;
export const hasRealZealMap = () => realZealRoutes !== null;
