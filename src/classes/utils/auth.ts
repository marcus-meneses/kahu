export interface AuthIdentity {
  id: string;
  customerId: string;
  login: string;
  email?: string | null;
  clearance: string;
  clearanceLevel: string;
}

export const decodeAccessToken = (token: string): AuthIdentity | null => {
  try {
    const [, payload] = token.split(".");
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized)) as {
      sub: string;
      customerId: string;
      login: string;
      email?: string | null;
      clearance: string;
      clearanceLevel: string;
    };

    return {
      id: decoded.sub,
      customerId: decoded.customerId,
      login: decoded.login,
      email: decoded.email,
      clearance: decoded.clearance,
      clearanceLevel: decoded.clearanceLevel,
    };
  } catch {
    return null;
  }
};
