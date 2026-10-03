import { useContext, useEffect } from "react";
import { UserContext, UserContextInterface } from "../contexts/UserContext";
import LoginBroker from "../brokers/LoginBroker";
import ApiBroker, { ApiRequestError } from "../../primitives/ApiBroker";
import { updateTomaDiagnostics } from "./TomaDiagnostics";

type TomaEnvelope = {
  kind: "notification";
  id: string;
  tenantId: string;
  event: { type: string; scope: string; entityId?: string; revision?: number };
  expiresAt: string;
};
const seen = new Set<string>();
const revisions = new Map<string, number>();
const validEnvelope = (value: unknown): value is TomaEnvelope => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>, event = item.event as Record<string, unknown> | undefined;
  return item.kind === "notification" && typeof item.id === "string" && typeof item.tenantId === "string"
    && Boolean(event) && typeof event?.type === "string" && typeof event?.scope === "string" && typeof item.expiresAt === "string";
};
const jittered = (attempt: number) => Math.round(Math.min(30000, 500 * 2 ** Math.min(attempt, 6)) * (0.75 + Math.random() * 0.5));

export function TomaRealtime() {
  const userContext = useContext(UserContext) as UserContextInterface;
  const config = userContext.config;
  const accessToken = config.apiData.apiAuthHeaderValue;
  const clientToken = config.apiData.apiTomaClientToken;
  const effectiveIdentityToken = userContext.impersonatedUser?.accessToken || accessToken;

  useEffect(() => {
    if (!effectiveIdentityToken || !clientToken) {
      updateTomaDiagnostics({ status: "idle", socketUrl: null });
      return;
    }
    updateTomaDiagnostics({
      status: "connecting",
      lastMessage: null,
      lastMessageAt: null,
      lastError: null,
    });
    let active = true, socket: WebSocket | null = null, retryTimer: number | undefined, attempt = 0;

    const refreshSession = async () => {
      const broker = new LoginBroker(config.apiData);
      const response = await broker.renew({ route: config.routesData.renew, data: { refreshToken: config.apiData.apiRefreshToken } });
      if (response.status !== 0) throw new Error(response.message);
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

    const schedule = () => {
      if (!active) return;
      const reconnectAttempt = attempt + 1;
      updateTomaDiagnostics({ status: "reconnecting", reconnectAttempt });
      retryTimer = window.setTimeout(() => void connect(), jittered(attempt++));
    };
    const connect = async () => {
      updateTomaDiagnostics({ status: attempt ? "reconnecting" : "connecting", reconnectAttempt: attempt });
      try {
        const broker = new ApiBroker(config.apiData);
        let ticket: { ticket: string; socketUrl: string };
        try {
          ticket = await broker.postData({ route: "/auth/toma-ticket", data: { clientToken: config.apiData.apiTomaClientToken } }) as typeof ticket;
        } catch (error) {
          if (!(error instanceof ApiRequestError) || error.status !== 409) throw error;
          await refreshSession();
          ticket = await new ApiBroker(config.apiData).postData({ route: "/auth/toma-ticket", data: { clientToken: config.apiData.apiTomaClientToken } }) as typeof ticket;
        }
        if (!active) return;
        updateTomaDiagnostics({ socketUrl: ticket.socketUrl });
        socket = new WebSocket(ticket.socketUrl + "?ticket=" + encodeURIComponent(ticket.ticket));
        socket.onopen = () => {
          attempt = 0;
          updateTomaDiagnostics({
            status: "connected",
            connectedAt: new Date().toISOString(),
            reconnectAttempt: 0,
            lastError: null,
          });
          window.dispatchEvent(new CustomEvent("kahu:toma-resync"));
        };
        socket.onmessage = event => {
          try {
            const envelope: unknown = JSON.parse(String(event.data));
            if (!validEnvelope(envelope)) throw new Error("Malformed notification");
            updateTomaDiagnostics({
              lastMessage: envelope,
              lastMessageAt: new Date().toISOString(),
            });
            if (seen.has(envelope.id) || Date.parse(envelope.expiresAt) <= Date.now()) return;
            const revision = envelope.event.revision;
            const current = revisions.get(envelope.event.scope);
            if (typeof revision === "number" && current !== undefined && revision <= current) {
              socket?.send(JSON.stringify({ kind: "ack", notificationId: envelope.id })); return;
            }
            if (typeof revision === "number") revisions.set(envelope.event.scope, revision);
            seen.add(envelope.id); if (seen.size > 1000) seen.delete(seen.values().next().value!);
            window.dispatchEvent(new CustomEvent("kahu:toma-invalidation", { detail: envelope.event }));
            socket?.send(JSON.stringify({ kind: "ack", notificationId: envelope.id }));
          } catch {
            updateTomaDiagnostics({ lastError: "Malformed notification" });
            socket?.close(1007, "Malformed notification");
          }
        };
        socket.onclose = event => {
          updateTomaDiagnostics({
            status: "disconnected",
            disconnectedAt: new Date().toISOString(),
            lastError: event.reason || null,
          });
          schedule();
        };
        socket.onerror = () => socket?.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        updateTomaDiagnostics({ status: "disconnected", lastError: message, disconnectedAt: new Date().toISOString() });
        console.warn("[Kahu Toma] real-time connection unavailable", message);
        schedule();
      }
    };
    void connect();
    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close(1000, "Component cleanup");
      updateTomaDiagnostics({ status: "disconnected", disconnectedAt: new Date().toISOString() });
    };
  }, [clientToken, config, effectiveIdentityToken]);

  return null;
}
