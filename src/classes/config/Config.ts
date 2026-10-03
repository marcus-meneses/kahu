import { apiConfig } from "../../primitives/apiBrokerInterfaces";
import { appConfig } from "../../config/appConfig";

export interface ConfigInterface {
  apiData: apiConfig;
  routesData: Record<string, string>;

  getApiData(): apiConfig;
  getRouteData(): Record<string, string>;
  getRoute(route: string): string;
  setApiData(data: apiConfig): void;
  storeApiData(): void;
  clearApiData(): void;
  hasAccessToken(): boolean;
  hasRefreshToken(): boolean;
  shouldRefreshAccessToken(): boolean;
}

const authStorageKey = "kahu.auth";
const refreshSkewMs = 60_000;

const zealUrl = (): URL => new URL(appConfig.services.zeal.url);

const storedAuth = (): Partial<apiConfig> => {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) ?? "{}") as Partial<apiConfig>;
  } catch {
    return {};
  }
};

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

export class Config implements ConfigInterface {
  public apiData: apiConfig;

  public routesData: Record<string, string> = {
    animals: "/api/animals",
    breeds: "/api/breeds",
    cities: "/api/cities",
    countries: "/api/countries",
    customers: "/api/customers",
    dump: "/api/dictionaries?limit=1&offset=0",
    login: "/auth/login",
    logout: "/auth/logout",
    impersonate: "/auth/impersonate",
    productCategories: "/api/product-categories",
    products: "/api/products",
    renew: "/auth/refresh",
    revoke: "/auth/logout",
    roles: "/api/dictionaries",
    schedules: "/api/work-schedules",
    services: "/api/services",
    species: "/api/species",
    states: "/api/states",
    tutors: "/api/tutors",
    units: "/api/units",
    users: "/api/users",
  };

  constructor() {
    const url = zealUrl();
    const saved = storedAuth();

    this.apiData = {
      apiHost: url.hostname,
      apiPort: url.port ? Number(url.port) : undefined,
      apiProtocol: url.protocol.replace(":", "") as "http" | "https",
      apiBasePath: url.pathname.replace(/\/$/, ""),
      apiAuthHeader: "Authorization",
      apiAuthHeaderValue: saved.apiAuthHeaderValue ?? "",
      apiRefreshToken: saved.apiRefreshToken ?? "",
      apiExpiration: saved.apiExpiration ?? "",
      apiTomaClientToken: saved.apiTomaClientToken ?? "",
      apiTomaSocketUrl: saved.apiTomaSocketUrl ?? "",
      apiTomaCredentialVersion: saved.apiTomaCredentialVersion ?? "",
    };
  }

  public getApiData() {
    return this.apiData;
  }

  public getRouteData() {
    return this.routesData;
  }

  public getRoute(route: string) {
    return this.routesData[route];
  }

  public setApiData(data: apiConfig) {
    Object.assign(this.apiData, data);
  }

  public storeApiData() {
    localStorage.setItem(
      authStorageKey,
      JSON.stringify({
        apiAuthHeaderValue: this.apiData.apiAuthHeaderValue,
        apiRefreshToken: this.apiData.apiRefreshToken,
        apiExpiration: this.apiData.apiExpiration,
        apiTomaClientToken: this.apiData.apiTomaClientToken,
        apiTomaSocketUrl: this.apiData.apiTomaSocketUrl,
        apiTomaCredentialVersion: this.apiData.apiTomaCredentialVersion,
      })
    );
  }

  public clearApiData() {
    Object.assign(this.apiData, {
      apiAuthHeaderValue: "",
      apiRefreshToken: "",
      apiExpiration: "",
      apiTomaClientToken: "",
      apiTomaSocketUrl: "",
      apiTomaCredentialVersion: "",
    });
    localStorage.removeItem(authStorageKey);
  }

  public hasAccessToken() {
    return Boolean(this.apiData.apiAuthHeaderValue);
  }

  public hasRefreshToken() {
    return Boolean(this.apiData.apiRefreshToken);
  }

  public shouldRefreshAccessToken() {
    const token = this.apiData.apiAuthHeaderValue;
    if (!token) return this.hasRefreshToken();

    const expiresAt = jwtExpiresAt(token);
    if (!expiresAt) return false;

    return Date.now() + refreshSkewMs >= expiresAt;
  }
}
