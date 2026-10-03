import { ReactNode, useContext, useEffect, useRef, useState } from "react";
import { RoutePermissionContext, routeMatches } from "../../classes/contexts/RoutePermissionContext";
import { Loader } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import LoginBroker from "../../classes/brokers/LoginBroker";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { ApiRequestError } from "../../primitives/ApiBroker";
import { useI18n } from "../../i18n/I18nContext";

const refreshSkewMs = 60_000;

const jwtExpiresAt = (token: string): number | null => {
  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { exp?: number };
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

const shouldRefreshAccessToken = (accessToken: string, refreshToken: string): boolean => {
  if (!accessToken) return Boolean(refreshToken);
  const expiresAt = jwtExpiresAt(accessToken);
  if (!expiresAt) return false;
  return Date.now() + refreshSkewMs >= expiresAt;
};

const isAuthFailure = (error: unknown): boolean =>
  error instanceof ApiRequestError && error.status === 401;

type AccessMap = {
  revision: number;
  kahu: Array<{ method: string; path: string; operation: string; section: string }>;
  zeal: Array<{ method: string; path: string; operation: string; section: string }>;
};
const permissionRevisionIntervalMs = 60_000;
const accessMapCache = new Map<string, { revision: number; checkedAt: number; map: Promise<AccessMap> }>();
const sessionChecks = new Map<string, Promise<unknown>>();
const checkSession = (broker: LoginBroker, token: string) => {
  const existing = sessionChecks.get(token);
  if (existing) return existing;
  const request = broker.me();
  sessionChecks.set(token, request);
  window.setTimeout(() => { if (sessionChecks.get(token) === request) sessionChecks.delete(token); }, 500);
  return request;
};
const loadAccessMap = async (broker: LoginBroker, token: string, impersonate: boolean): Promise<AccessMap> => {
  const now = Date.now();
  const existing = accessMapCache.get(token);
  if (existing && now - existing.checkedAt < permissionRevisionIntervalMs) return existing.map;

  const { data: revisionData } = await broker.permissionRevision(impersonate);
  if (existing?.revision === revisionData.revision) {
    accessMapCache.set(token, { ...existing, checkedAt: now });
    return existing.map;
  }

  const request = broker.accessMap(impersonate)
    .then((response) => response.data)
    .catch((error) => { accessMapCache.delete(token); throw error; });
  accessMapCache.set(token, { revision: revisionData.revision, checkedAt: now, map: request });
  const map = await request;
  accessMapCache.set(token, { revision: map.revision, checkedAt: now, map: Promise.resolve(map) });
  return map;
};

export function AuthGate({ children }: { children: ReactNode }) {
  const userContext = useContext(UserContext) as UserContextInterface;
  const routePermissions = useContext(RoutePermissionContext);
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveIdentity = userContext.impersonatedUser?.id || "self";
  const validationTarget = effectiveIdentity + ":" + location.pathname;
  const [validatedTarget, setValidatedTarget] = useState<string | null>(null);
  const [permissionRevisionTick, setPermissionRevisionTick] = useState(0);
  const permissionSubjectRef = useRef<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const checkRevision = () => setPermissionRevisionTick((value) => value + 1);
    const checkRevisionWhileFocused = () => { if (document.hasFocus()) checkRevision(); };
    const timer = window.setInterval(checkRevisionWhileFocused, permissionRevisionIntervalMs);
    window.addEventListener("focus", checkRevision);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkRevision);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const target = validationTarget;
    const permissionOnlyCheck = validatedTarget === target;
    const config = userContext.config;
    const loginBroker = new LoginBroker(config.apiData);
    const permissionSubject = userContext.impersonatedUser?.accessToken || config.apiData.apiAuthHeaderValue;
    if (permissionSubjectRef.current !== permissionSubject) {
      permissionSubjectRef.current = permissionSubject;
      routePermissions?.setRoutes(null);
      routePermissions?.setRealRoutes(null);
      routePermissions?.setZealRoutes(null);
      routePermissions?.setRealZealRoutes(null);
    }

    const refreshSession = async () => {
      const refreshToken = config.apiData.apiRefreshToken;
      if (!refreshToken) throw new Error(t("auth.missingRefreshToken"));

      const response = await loginBroker.renew({ route: config.routesData.renew, data: { refreshToken } });

      if (response.status === 1) {
        throw new Error(response.message);
      }

      config.setApiData({
        ...config.apiData,
        apiAuthHeaderValue: response.session.token,
        apiRefreshToken: response.session.refreshToken,
        apiExpiration: response.session.expiration,
        apiTomaClientToken: response.session.toma?.clientToken ?? "",
        apiTomaSocketUrl: response.session.toma?.socketUrl ?? "",
        apiTomaCredentialVersion: response.session.toma?.credentialVersion ?? "",
      });
      config.storeApiData();
    };

    const expireSession = () => {
      config.clearApiData();
      userContext.setImpersonatedUser(null);
      navigate("/login", { replace: true });
    };

    const validateSession = async () => {
      const accessToken = config.apiData.apiAuthHeaderValue;
      const refreshToken = config.apiData.apiRefreshToken;

      if (!accessToken && !refreshToken) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        if (shouldRefreshAccessToken(accessToken, refreshToken)) {
          await refreshSession();
        } else if (!permissionOnlyCheck) {
          try {
            await checkSession(loginBroker, accessToken);
          } catch (error) {
            if (!isAuthFailure(error)) throw error;
            await refreshSession();
          }
        }

        const permissionBroker = new LoginBroker(config.apiData);
        const realToken = config.apiData.apiAuthHeaderValue;
        const effectiveToken = userContext.impersonatedUser?.accessToken || realToken;
        permissionSubjectRef.current = effectiveToken;
        const effectiveRequest = loadAccessMap(permissionBroker, effectiveToken, true);
        const [effectiveMap, realMap] = effectiveToken === realToken
          ? await effectiveRequest.then((map) => [map, map] as const)
          : await Promise.all([effectiveRequest, loadAccessMap(permissionBroker, realToken, false)]);
        if (!active) return;
        routePermissions?.setRoutes(effectiveMap.kahu);
        routePermissions?.setRealRoutes(realMap.kahu);
        routePermissions?.setZealRoutes(effectiveMap.zeal);
        routePermissions?.setRealZealRoutes(realMap.zeal);
        const protectedRoute = location.pathname.startsWith("/home") || location.pathname.startsWith("/actions");
        const permissionAliases: Record<string, string> = {
          "/home/main": "/home/dash",
          "/home/veterinaria": "/home/veterinary",
        };
        const permissionPath = permissionAliases[location.pathname] ?? location.pathname;
        const allowed = effectiveMap.kahu.some((route) => route.method === "GET" && routeMatches(route.path, permissionPath));
        if (protectedRoute && !allowed) { navigate("/notfound", { replace: true }); return; }
        setValidatedTarget(target);
      } catch (error) {
        if (!active) return;

        if (isAuthFailure(error) || (error instanceof Error && error.message === t("auth.missingRefreshToken"))) {
          expireSession();
          return;
        }

        navigate("/error", { replace: true });
      }
    };

    void validateSession();

    return () => {
      active = false;
    };
  }, [location.pathname, navigate, permissionRevisionTick, t, userContext, userContext.impersonatedUser?.id, validationTarget]);

  if (validatedTarget !== validationTarget) {
    return <Loader color="light.1" style={{ margin: "4rem auto", display: "block" }} />;
  }

  return <>{children}</>;
}
