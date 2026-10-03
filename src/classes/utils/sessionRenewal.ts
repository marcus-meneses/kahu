export const kahuAuthApp = "kahu";

export type KahuAuthResponse = {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
  expiresIn: string;
  app?: string;
  toma?: { clientToken: string; socketUrl: string; credentialVersion: string };
};

type RenewalExecutor = (refreshToken: string) => Promise<KahuAuthResponse>;
type StoredAuth = {
  apiAuthHeaderValue?: string;
  apiRefreshToken?: string;
  apiExpiration?: string;
  apiTomaClientToken?: string;
  apiTomaSocketUrl?: string;
  apiTomaCredentialVersion?: string;
};

const authStorageKey = "kahu.auth";
const refreshLockName = "kahu.auth.refresh";
const inFlightRenewals = new Map<string, Promise<KahuAuthResponse>>();

const readStoredAuth = (): StoredAuth | null => {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) ?? "null") as StoredAuth | null;
  } catch {
    return null;
  }
};

const responseFromNewerStoredSession = (refreshToken: string): KahuAuthResponse | null => {
  const stored = readStoredAuth();
  if (!stored?.apiAuthHeaderValue || !stored.apiRefreshToken || stored.apiRefreshToken === refreshToken) return null;

  return {
    accessToken: stored.apiAuthHeaderValue,
    refreshToken: stored.apiRefreshToken,
    refreshTokenExpiresAt: stored.apiExpiration ?? "",
    tokenType: "Bearer",
    expiresIn: "",
    app: kahuAuthApp,
    toma: stored.apiTomaClientToken ? {
      clientToken: stored.apiTomaClientToken,
      socketUrl: stored.apiTomaSocketUrl ?? "",
      credentialVersion: stored.apiTomaCredentialVersion ?? "",
    } : undefined,
  };
};

const persistRenewedSession = (response: KahuAuthResponse) => {
  localStorage.setItem(authStorageKey, JSON.stringify({
    apiAuthHeaderValue: response.accessToken,
    apiRefreshToken: response.refreshToken,
    apiExpiration: response.refreshTokenExpiresAt,
    apiTomaClientToken: response.toma?.clientToken ?? "",
    apiTomaSocketUrl: response.toma?.socketUrl ?? "",
    apiTomaCredentialVersion: response.toma?.credentialVersion ?? "",
  }));
};

const executeRenewal = async (refreshToken: string, executor: RenewalExecutor): Promise<KahuAuthResponse> => {
  const newerSession = responseFromNewerStoredSession(refreshToken);
  if (newerSession) return newerSession;

  const response = await executor(refreshToken);
  persistRenewedSession(response);
  return response;
};

export const renewKahuSession = (refreshToken: string, executor: RenewalExecutor): Promise<KahuAuthResponse> => {
  const existing = inFlightRenewals.get(refreshToken);
  if (existing) return existing;

  const renewal = (
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(refreshLockName, () => executeRenewal(refreshToken, executor))
      : executeRenewal(refreshToken, executor)
  ).finally(() => {
    inFlightRenewals.delete(refreshToken);
  });

  inFlightRenewals.set(refreshToken, renewal);
  return renewal;
};
