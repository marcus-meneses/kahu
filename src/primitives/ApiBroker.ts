import {
  apiConfig,
  filterQuery,
  getDataRequest,
  getDataResponse,
  orderQuery,
  postDataRequest,
} from "./apiBrokerInterfaces";
import { kahuAuthApp, renewKahuSession } from "../classes/utils/sessionRenewal";
import { findEffectiveZealRoute, findRealZealRoute, hasEffectiveZealMap, hasRealZealMap } from "../classes/utils/permissionRegistry";

type ApiErrorBody = { message?: string; reason?: string };
type ZealAuthResponse = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
  expiresIn: string;
  app?: string;
  toma?: { clientToken: string; socketUrl: string; credentialVersion: string };
};
type ImpersonationAuthResponse = {
  accessToken: string;
  expiresIn: string;
  impersonatedUser: ImpersonationRecord;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly method: string
  ) {
    super(`${method} ${url} failed with ${status}: ${message}`);
    this.name = "ApiRequestError";
  }
}
export class ApiPermissionError extends Error {
  readonly status = 403;
  constructor(public readonly method: string, public readonly path: string, mapLoaded: boolean) {
    super(mapLoaded
      ? `Permissão negada: ${method} ${path} não está entre as rotas ZEAL autorizadas para o usuário efetivo.`
      : `Permissões ZEAL ainda não foram carregadas; a requisição ${method} ${path} foi bloqueada.`);
    this.name = "ApiPermissionError";
  }
}

type ImpersonationRecord = { id: string; customerId: string; accessToken?: string };

const authStorageKey = "kahu.auth";
const impersonationStorageKey = "kahu.impersonation";
const refreshSkewMs = 60_000;

const impersonationRenewals = new Map<string, Promise<void>>();

const currentImpersonation = (): ImpersonationRecord | null => {
  try {
    return JSON.parse(sessionStorage.getItem(impersonationStorageKey) ?? "null") as ImpersonationRecord | null;
  } catch {
    return null;
  }
};

const storeAuth = (config: apiConfig) => {
  localStorage.setItem(
    authStorageKey,
    JSON.stringify({
      apiAuthHeaderValue: config.apiAuthHeaderValue,
      apiRefreshToken: config.apiRefreshToken,
      apiExpiration: config.apiExpiration,
      apiTomaClientToken: config.apiTomaClientToken,
      apiTomaSocketUrl: config.apiTomaSocketUrl,
      apiTomaCredentialVersion: config.apiTomaCredentialVersion,
    })
  );
};

const storeImpersonation = (impersonation: ImpersonationRecord) => {
  sessionStorage.setItem(impersonationStorageKey, JSON.stringify(impersonation));
};

const jwtExpiresAt = (token?: string): number | null => {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as { exp?: number };
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

const shouldRefreshToken = (token?: string): boolean => {
  const expiresAt = jwtExpiresAt(token);
  return Boolean(expiresAt && Date.now() + refreshSkewMs >= expiresAt);
};

type ListBody<T = unknown> = { data: T[]; count?: number };

export default class ApiBroker {
  private config: apiConfig;

  constructor(config: apiConfig) {
    this.config = config;
  }

  updateConfig(config: apiConfig) {
    this.config = config;
  }

  protected baseUrl(): URL {
    const port = this.config.apiPort ? `:${this.config.apiPort}` : "";
    const basePath = this.config.apiBasePath ? `/${this.config.apiBasePath.replace(/^\/+|\/+$/g, "")}` : "";
    return new URL(`${this.config.apiProtocol}://${this.config.apiHost}${port}${basePath || "/"}`);
  }

  protected async request<T>(path: string, init: RequestInit & { auth?: boolean; impersonate?: boolean } = {}): Promise<T> {
    return this.requestWithAuthRetry<T>(path, init, false);
  }

  private async requestWithAuthRetry<T>(path: string, init: RequestInit & { auth?: boolean; impersonate?: boolean }, retried: boolean): Promise<T> {
    if (init.auth !== false) {
      this.assertRequestPermission(path, init.method ?? "GET", init.impersonate !== false);
      await this.refreshBeforeRequest(init);
    }

    const response = await this.fetchOnce<T>(path, init);

    if (response.ok) return response.body;

    if (!retried && init.auth !== false && this.isAuthFailure(response.status)) {
      await this.recoverSession(init);
      return this.requestWithAuthRetry<T>(path, init, true);
    }

    throw new ApiRequestError(response.message, response.status, response.url, init.method ?? "GET");
  }

  private async fetchOnce<T>(path: string, init: RequestInit & { auth?: boolean; impersonate?: boolean }) {
    const url = new URL(path, this.baseUrl());
    if (import.meta.env.DEV) {
      console.debug("Kahu API", init.method ?? "GET", url.toString());
    }

    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");

    if (init.auth !== false) {
      const impersonation = init.impersonate !== false ? currentImpersonation() : null;
      const token = impersonation?.accessToken || this.config.apiAuthHeaderValue;

      if (token) {
        headers.set(this.config.apiAuthHeader, `Bearer ${token}`);
      }
    }

    const fetchInit: RequestInit & { auth?: boolean; impersonate?: boolean } = { ...init };
    delete fetchInit.auth;
    delete fetchInit.impersonate;
    const response = await fetch(url, {
      ...fetchInit,
      headers,
    });

    if (response.status === 204) {
      return { ok: true as const, body: undefined as T, status: response.status, url: url.toString(), message: "" };
    }

    const body = (await response.json().catch(() => ({}))) as T | ApiErrorBody;

    if (response.ok) {
      return { ok: true as const, body: body as T, status: response.status, url: url.toString(), message: "" };
    }

    const errorBody = body as ApiErrorBody;
    return {
      ok: false as const,
      body: undefined as T,
      status: response.status,
      url: url.toString(),
      message: errorBody.message ?? errorBody.reason ?? "Request failed",
    };
  }

  private assertRequestPermission(path: string, method: string, useEffectivePermissions: boolean) {
    const pathname = new URL(path, this.baseUrl()).pathname;
    const bootstrap = pathname.startsWith("/auth/") || pathname === "/api/permissions/kahu" || pathname === "/api/permissions/zeal" || pathname === "/api/permissions/access-map" || pathname === "/api/permissions/revision";
    const authorizedRoute = useEffectivePermissions ? findEffectiveZealRoute(method, pathname) : findRealZealRoute(method, pathname);
    if (bootstrap || authorizedRoute) return;
    const mapLoaded = useEffectivePermissions ? hasEffectiveZealMap() : hasRealZealMap();
    const error = new ApiPermissionError(method.toUpperCase(), pathname, mapLoaded);
    console.warn(`[Kahu ApiBroker] ${error.message}`);
    throw error;
  }

  private async refreshBeforeRequest(init: RequestInit & { impersonate?: boolean }) {
    if (shouldRefreshToken(this.config.apiAuthHeaderValue)) {
      await this.renewMainToken();
    }

    const impersonation = init.impersonate !== false ? currentImpersonation() : null;
    if (impersonation?.accessToken && shouldRefreshToken(impersonation.accessToken)) {
      await this.renewImpersonation(impersonation);
    }
  }

  private async recoverSession(init: RequestInit & { impersonate?: boolean }) {
    const impersonation = init.impersonate !== false ? currentImpersonation() : null;

    if (impersonation?.accessToken) {
      await this.renewImpersonation(impersonation);
      return;
    }

    await this.renewMainToken();
  }

  private async renewMainToken() {
    if (!this.config.apiRefreshToken) {
      throw new ApiRequestError("Missing refresh token", 401, new URL("/auth/refresh", this.baseUrl()).toString(), "POST");
    }

    const response = await renewKahuSession(this.config.apiRefreshToken, (refreshToken) =>
      this.fetchAuth<ZealAuthResponse>("/auth/refresh", {
        refreshToken,
        app: kahuAuthApp,
      })
    );

    this.config.apiAuthHeaderValue = response.accessToken;
    this.config.apiRefreshToken = response.refreshToken;
    this.config.apiExpiration = response.refreshTokenExpiresAt;
    this.config.apiTomaClientToken = response.toma?.clientToken ?? "";
    this.config.apiTomaSocketUrl = response.toma?.socketUrl ?? "";
    this.config.apiTomaCredentialVersion = response.toma?.credentialVersion ?? "";
    storeAuth(this.config);
  }

  private async renewImpersonation(impersonation: ImpersonationRecord) {
    const existing = impersonationRenewals.get(impersonation.id);
    if (existing) return existing;

    const renewal = this.renewMainToken()
      .then(() => this.fetchAuth<ImpersonationAuthResponse>("/auth/impersonate", { userId: impersonation.id }, true))
      .then((response) => {
        storeImpersonation({
          ...impersonation,
          ...response.impersonatedUser,
          accessToken: response.accessToken,
        });
      })
      .finally(() => {
        impersonationRenewals.delete(impersonation.id);
      });

    impersonationRenewals.set(impersonation.id, renewal);
    return renewal;
  }

  private async fetchAuth<T>(path: string, body: unknown, auth = false): Promise<T> {
    const url = new URL(path, this.baseUrl());
    const headers = new Headers({ accept: "application/json", "content-type": "application/json" });

    if (auth && this.config.apiAuthHeaderValue) {
      headers.set(this.config.apiAuthHeader, `Bearer ${this.config.apiAuthHeaderValue}`);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const responseBody = (await response.json().catch(() => ({}))) as T | ApiErrorBody;

    if (!response.ok) {
      const errorBody = responseBody as ApiErrorBody;
      throw new ApiRequestError(errorBody.message ?? errorBody.reason ?? "Request failed", response.status, url.toString(), "POST");
    }

    return responseBody as T;
  }

  private isAuthFailure(status: number): boolean {
    return status === 401;
  }

  async publicGet<T>(route: string): Promise<T> {
    return this.request<T>(this.normalizeRoute(route), { method: "GET", auth: false, impersonate: false });
  }

  async publicPost<T>(route: string, data: unknown): Promise<T> {
    return this.request<T>(this.normalizeRoute(route), { method: "POST", body: JSON.stringify(data), auth: false, impersonate: false });
  }

  async getDataPlain(request: { route: string; method: string }) {
    return this.request(this.normalizeRoute(request.route), { method: request.method });
  }

  async getData(request: getDataRequest): Promise<getDataResponse> {
    const query = request.query;
    const path = this.withListQuery(this.normalizeRoute(request.route ?? "/"), query);
    const response = await this.request<ListBody>(path, { method: request.method ?? "GET", impersonate: request.impersonate });
    const pageSize = query?.pageSize ?? response.data.length;
    const pageIndex = query?.pageIndex ?? 0;

    return {
      status: 0,
      message: "ok",
      pagination: {
        pageSize,
        pageNumber: pageIndex,
        startIndex: pageIndex * pageSize,
        totalRecords: response.count ?? response.data.length,
        pageRecords: response.data.length,
        order: query?.orders ?? [],
        filters: query?.filters ?? [],
      },
      data: response.data,
    };
  }

  async postData(request: postDataRequest) {
    return this.request(this.normalizeRoute(request.route), {
      method: "POST",
      body: JSON.stringify(request.data),
      impersonate: request.impersonate,
    });
  }

  async putData(request: postDataRequest) {
    const id = (request.data as { id?: string | number }).id;
    return this.request(`${this.normalizeRoute(request.route)}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(request.data),
      impersonate: request.impersonate,
    });
  }


  async uploadFile(request: { route: string; file: File; method?: "PUT" | "POST" }) {
    return this.request(this.normalizeRoute(request.route), {
      method: request.method ?? "PUT",
      headers: {
        "content-type": request.file.type || "application/octet-stream",
        "x-file-name": request.file.name,
      },
      body: request.file,
    });
  }


  async getBlob(route: string): Promise<Blob> {
    return this.getBlobWithAuthRetry(this.normalizeRoute(route), false);
  }

  private async getBlobWithAuthRetry(route: string, retried: boolean): Promise<Blob> {
    await this.refreshBeforeRequest({});

    const url = new URL(route, this.baseUrl());
    const headers = new Headers({ accept: "*/*" });
    const impersonation = currentImpersonation();
    const token = impersonation?.accessToken || this.config.apiAuthHeaderValue;

    if (token) {
      headers.set(this.config.apiAuthHeader, `Bearer ${token}`);
    }

    const response = await fetch(url, { method: "GET", headers });

    if (response.ok) {
      return response.blob();
    }

    if (!retried && this.isAuthFailure(response.status)) {
      await this.recoverSession({});
      return this.getBlobWithAuthRetry(route, true);
    }

    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiRequestError(errorBody.message ?? errorBody.reason ?? "Request failed", response.status, url.toString(), "GET");
  }

  async deleteRoute(route: string) {
    return this.request(this.normalizeRoute(route), {
      method: "DELETE",
    });
  }

  async deleteData(request: postDataRequest) {
    const id = (request.data as { id?: string | number }).id;
    return this.request(`${this.normalizeRoute(request.route)}/${id}`, {
      method: "DELETE",
      impersonate: request.impersonate,
    });
  }

  private normalizeRoute(route: string): string {
    if (route.startsWith("/")) return route;
    return `/${route}`;
  }

  private withListQuery(
    route: string,
    query?: {
      pageSize: number;
      pageIndex: number;
      orders: orderQuery[];
      filters: filterQuery[];
      options?: Record<string, string | number | boolean | null | undefined>;
    }
  ): string {
    const params = new URLSearchParams();
    if (query?.pageSize !== undefined) params.set("limit", String(query.pageSize));
    if (query?.pageIndex !== undefined && query?.pageSize !== undefined) {
      params.set("offset", String(query.pageIndex * query.pageSize));
    }

    const searchFilter = query?.filters.find((filter) => filter.o === "LIKE" || filter.o === "STARTS" || filter.o === "HAS");
    if (searchFilter?.v) params.set("search", searchFilter.v);

    for (const [key, value] of Object.entries(query?.options ?? {})) {
      if (value === undefined || value === null) continue;
      params.set(key, String(value));
    }

    const serialized = params.toString();
    return serialized ? `${route}?${serialized}` : route;
  }
}
