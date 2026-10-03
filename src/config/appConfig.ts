type ServiceConfig = Readonly<{ url: string }>;
type RuntimeConfig = {
  app?: { environment?: string; publicUrl?: string };
  services?: { zeal?: { url?: string } };
};

declare global {
  interface Window { __APP_CONFIG__?: RuntimeConfig }
}

const normalizeUrl = (value: string, name: string): string => {
  try { return new URL(value).toString().replace(/\/$/, ""); }
  catch { throw new Error(`Invalid ${name}: ${value}`); }
};

const runtime = typeof window === "undefined" ? undefined : window.__APP_CONFIG__;
const developmentFallback = import.meta.env.DEV ? "http://localhost:3000" : "";
const zealUrl = runtime?.services?.zeal?.url
  ?? import.meta.env.VITE_SERVICE_ZEAL_URL
  ?? import.meta.env.VITE_ZEAL_URL
  ?? developmentFallback;

if (!zealUrl) throw new Error("Missing Kahu service configuration: services.zeal.url");

export const appConfig = Object.freeze({
  app: Object.freeze({
    environment: runtime?.app?.environment ?? import.meta.env.MODE,
    publicUrl: runtime?.app?.publicUrl ?? (typeof window === "undefined" ? "" : window.location.origin),
  }),
  services: Object.freeze({
    zeal: Object.freeze<ServiceConfig>({ url: normalizeUrl(zealUrl, "services.zeal.url") }),
  }),
});
