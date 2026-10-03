import ApiBroker from "../../primitives/ApiBroker";
import {
  postDataRequest,
  apiConfig,
  loginResponse,
  zealAuthResponse,
  impersonationAuthResponse,
} from "../../primitives/apiBrokerInterfaces";
import { kahuAuthApp, renewKahuSession } from "../utils/sessionRenewal";

const toLoginResponse = (response: zealAuthResponse, message = "Authenticated"): loginResponse => ({
  status: 0,
  message,
  session: {
    token: response.accessToken,
    refreshToken: response.refreshToken,
    expiration: response.refreshTokenExpiresAt,
    toma: response.toma,
  },
});

export default class LoginBroker extends ApiBroker {
  constructor(config: apiConfig) {
    super(config);
  }

  async login(request: postDataRequest): Promise<loginResponse> {
    const response = await this.request<zealAuthResponse>(request.route || "/auth/login", {
      method: "POST",
      body: JSON.stringify(request.data),
      auth: false,
      impersonate: false,
    });
    return toLoginResponse(response, "Login successful");
  }

  async renew(request: postDataRequest): Promise<loginResponse> {
    const refreshToken = (request.data as { refreshToken?: string; token?: string }).refreshToken;
    if (!refreshToken) {
      return { status: 1, message: "Missing refresh token", session: { token: "", refreshToken: "", expiration: "" } };
    }

    const response = await renewKahuSession(refreshToken, (token) =>
      this.request<zealAuthResponse>(request.route || "/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: token, app: kahuAuthApp }),
        auth: false,
        impersonate: false,
      })
    );

    return toLoginResponse(response, "Session refreshed");
  }


  async impersonate(request: postDataRequest): Promise<impersonationAuthResponse> {
    const userId = (request.data as { userId?: string }).userId;

    if (!userId) {
      throw new Error("Missing user id");
    }

    return this.request<impersonationAuthResponse>(request.route || "/auth/impersonate", {
      method: "POST",
      body: JSON.stringify({ userId }),
      impersonate: false,
    });
  }

  async revoke(request: postDataRequest): Promise<void> {
    return this.logout(request);
  }

  async logout(request: postDataRequest): Promise<void> {
    const refreshToken = (request.data as { refreshToken?: string; token?: string }).refreshToken;
    if (!refreshToken) return;

    await this.request<void>(request.route || "/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken, app: kahuAuthApp }),
      auth: false,
      impersonate: false,
    });
  }

  async accessMap(impersonate = true): Promise<{ data: { revision: number; kahu: Array<{ method: string; path: string; operation: string; section: string }>; zeal: Array<{ method: string; path: string; operation: string; section: string }> } }> {
    return this.request("/api/permissions/access-map", { method: "GET", impersonate });
  }

  async permissionRevision(impersonate = true): Promise<{ data: { revision: number } }> {
    return this.request("/api/permissions/revision", { method: "GET", impersonate });
  }

  async kahuPermissions(impersonate = true): Promise<{ data: Array<{ method: string; path: string; operation: string; section: string }>; count: number }> {
    return this.request("/api/permissions/kahu", { method: "GET", impersonate });
  }

  async zealPermissions(impersonate = true): Promise<{ data: Array<{ method: string; path: string; operation: string; section: string }>; count: number }> {
    return this.request("/api/permissions/zeal", { method: "GET", impersonate });
  }

  async me() {
    return this.request("/auth/me", { method: "GET", impersonate: false });
  }

  async dump() {
    return this.request("/api/dictionaries?limit=1&offset=0", { method: "GET", impersonate: false });
  }
}
