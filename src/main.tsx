import { StrictMode, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { ImpersonatedUser, UserContext } from "./classes/contexts/UserContext.ts";
import { ModuleStateProvider } from "./classes/contexts/ModuleStateContext.tsx";
import { RoutePermissionContext, RoutePermissionProvider } from "./classes/contexts/RoutePermissionContext.tsx";
import { DetailTransitionProvider } from "./classes/contexts/DetailTransitionContext.tsx";
import { NavigationStackProvider, useNavigationStack } from "./classes/contexts/NavigationStackContext.tsx";
import { ExternalDialogProvider } from "./classes/contexts/ExternalDialogContext.tsx";
import { Periwinkle } from "./classes/themes/Periwinkle.theme";
import { Config } from "./classes/config/Config.ts";
import { I18nProvider } from "./i18n/I18nContext.tsx";

import Index from "./routes/index.tsx";
import NotFoundPage from "./routes/errors/notfound.tsx";
import ErrorPage from "./routes/errors/error.tsx";
import Login from "./routes/login.tsx";
import Landing from "./routes/landing.tsx";
import Actions from "./routes/actions.tsx";
import CustomerForm from "./components/customerform/CustomerForm.tsx";
import LeftSideBar from "./components/leftsidebar/LeftSideBar.tsx";
import { ImpersonationOverlay } from "./components/impersonation/ImpersonationOverlay.tsx";
import { AuthGate } from "./components/auth/AuthGate.tsx";
import { DetailTransitionOverlay } from "./components/detailtransition/DetailTransitionOverlay.tsx";
import { ActivityHost } from "./components/activity/ActivityHost.tsx";
import { ActivityModalProvider } from "./components/activity/ActivityModal.tsx";
import { PwaMetadata } from "./components/pwa/PwaMetadata.tsx";
import { TomaRealtime } from "./classes/realtime/TomaRealtime.tsx";
import { installNorsteinInteractionExport } from "./classes/utils/norsteinInteractions.ts";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@css/main.module.css";
installNorsteinInteractionExport();

const sidebarHiddenPaths = new Set(["/", "/create", "/login", "/error", "/notfound", "/loggedout"]);
const tomaRealtimePaths = new Set(["/home/veterinaria", "/home/grooming", "/home/hotel", "/home/main"]);
const impersonationStorageKey = "kahu.impersonation";

const storedImpersonation = (): ImpersonatedUser | null => {
  try {
    const stored = sessionStorage.getItem(impersonationStorageKey) ?? localStorage.getItem(impersonationStorageKey);
    if (stored && !sessionStorage.getItem(impersonationStorageKey)) sessionStorage.setItem(impersonationStorageKey, stored);
    localStorage.removeItem(impersonationStorageKey);
    return JSON.parse(stored ?? "null") as ImpersonatedUser | null;
  } catch {
    return null;
  }
};

function AppRoutes() {
  const location = useLocation();
  const permissions = useContext(RoutePermissionContext);
  const dashboardVisible = !sidebarHiddenPaths.has(location.pathname) && !location.pathname.startsWith("/actions");
  const tomaRealtimeVisible = tomaRealtimePaths.has(location.pathname);
  const activityPermissionsReady = Boolean(
    permissions &&
    permissions.routes !== null &&
    permissions.realRoutes !== null &&
    permissions.zealRoutes !== null &&
    permissions.realZealRoutes !== null
  );

  useEffect(() => {
    document.body.dataset.kahuDashboard = String(dashboardVisible);
    return () => { delete document.body.dataset.kahuDashboard; };
  }, [dashboardVisible]);

  return ( 
    <>
      <PwaMetadata />
      {tomaRealtimeVisible && <TomaRealtime />}
      <Notifications />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<AuthGate><Index /></AuthGate>} />
        <Route path="/home/:section/:action" element={<AuthGate><Index /></AuthGate>} />
        <Route path="/home/:section" element={<AuthGate><Index /></AuthGate>} />
        <Route path="/login" element={<Login />} />
        <Route path="/actions/:action" element={<AuthGate><Actions /></AuthGate>} />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="/notfound" element={<NotFoundPage />} />
        <Route path="/loggedout" element={<Navigate to="/login" replace />} />
        <Route path="/create" element={<CustomerForm />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {dashboardVisible && activityPermissionsReady && <ActivityHost />}
      {dashboardVisible && <LeftSideBar />}
      {dashboardVisible && <ImpersonationOverlay />}
      {dashboardVisible && <DetailTransitionOverlay />}
    </>
  );
}

function ActivityModalLayer({ children }: { children: React.ReactNode }) {
  const { clearNavigationStack, frames } = useNavigationStack();
  const activityCount = frames.filter((frame) => frame.activity).length;

  return <ActivityModalProvider activityCount={activityCount} onDismiss={clearNavigationStack}>{children}</ActivityModalProvider>;
}

function App() {
  const config = useMemo(() => new Config(), []);
  const [impersonatedUser, setStoredImpersonatedUser] = useState<ImpersonatedUser | null>(storedImpersonation);
  const setImpersonatedUser = (user: ImpersonatedUser | null) => {
    setStoredImpersonatedUser(user);
    if (user) sessionStorage.setItem(impersonationStorageKey, JSON.stringify(user));
    else sessionStorage.removeItem(impersonationStorageKey);
  };

  return (
    <StrictMode>
      <UserContext.Provider value={{ config, impersonatedUser, setImpersonatedUser }}>
        <I18nProvider>
          <MantineProvider theme={Periwinkle}>
            <ModalsProvider>
              <ModuleStateProvider>
                <RoutePermissionProvider>
                  <DetailTransitionProvider>
                  <BrowserRouter>
                    <NavigationStackProvider>
                      <ActivityModalLayer>
                        <ExternalDialogProvider>
                          <AppRoutes />
                        </ExternalDialogProvider>
                      </ActivityModalLayer>
                    </NavigationStackProvider>
                  </BrowserRouter>
                </DetailTransitionProvider>
                </RoutePermissionProvider>
              </ModuleStateProvider>
            </ModalsProvider>
          </MantineProvider>
        </I18nProvider>
      </UserContext.Provider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
