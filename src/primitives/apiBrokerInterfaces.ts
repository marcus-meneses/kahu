export interface brokerConfig {
  port: number;
  host: string;
  authHeader?: string;
}

export interface apiConfig {
  apiHost: string;
  apiPort?: number;
  apiProtocol: "http" | "https";
  apiBasePath: string;
  apiAuthHeader: string;
  apiAuthHeaderValue: string;
  apiRefreshToken: string;
  apiExpiration: string;
  apiTomaClientToken: string;
  apiTomaSocketUrl: string;
  apiTomaCredentialVersion: string;
}

export interface orderQuery {
  f: string;
  d: "ASC" | "DESC";
}

export interface filterQuery {
  f: string;
  o: "=" |  "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN" | "STARTS" | "HAS" | "ENDS";
  v: string;
}

export interface getDataRequest {
  route?: string;
  method?: string;
  impersonate?: boolean;
  query?: {
    pageSize: number;
    pageIndex: number;
    orders: orderQuery[];
    filters: filterQuery[];
    options?: Record<string, string | number | boolean | null | undefined>;
  };
}

export interface getDataResponse {
  status: number;
  pagination: {
    pageSize: number;
    pageNumber: number;
    startIndex: number;
    totalRecords: number;
    pageRecords: number;
    order: orderQuery[];
    filters: filterQuery[];
  };
  message: string;
  data: unknown[];
}

export interface postDataRequest {
  route: string;
  data: unknown;
  impersonate?: boolean;
}

export interface loginRequest {
  login: string;
  password: string;
  app?: string;
}

export interface loginResponse {
  status: number;
  message: string;
  session: {
    token: string;
    refreshToken: string;
    expiration: string;
    toma?: { clientToken: string; socketUrl: string; credentialVersion: string };
  };
}

export interface zealAuthResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
  expiresIn: string;
  app?: string;
  toma?: { clientToken: string; socketUrl: string; credentialVersion: string };
}


export interface impersonationAuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  impersonatedUser: {
    id: string;
    customerId: string;
    login?: string | null;
    email?: string | null;
    clearance?: string | null;
    clearanceLevel?: string | null;
  };
  actorUser?: {
    id: string;
    customerId: string;
    login?: string | null;
    email?: string | null;
    clearance?: string | null;
    clearanceLevel?: string | null;
  };
}
