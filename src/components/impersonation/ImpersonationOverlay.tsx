import { useContext, useMemo, useState } from "react";
import { ActionIcon, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import FeatherIcon from "feather-icons-react";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { useNavigationStack } from "../../classes/contexts/NavigationStackContext";
import { decodeAccessToken } from "../../classes/utils/auth";
import { RoutePermissionContext } from "../../classes/contexts/RoutePermissionContext";
import { useI18n } from "../../i18n/I18nContext";
import classes from "./ImpersonationOverlay.module.css";

const maskToken = (value?: string | null) => {
  if (!value) return value;
  if (value.length <= 16) return "***";
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
};

const maskImpersonatedUser = <T extends { accessToken?: string } | null>(user: T): T => {
  if (!user) return user;

  return {
    ...user,
    accessToken: maskToken(user.accessToken),
  } as T;
};

export function ImpersonationOverlay() {
  const userContext = useContext(UserContext) as UserContextInterface;
  const identity = decodeAccessToken(userContext.config.apiData.apiAuthHeaderValue);
  const [debugOpen, setDebugOpen] = useState(false);
  const { t } = useI18n();
  const navigationStack = useNavigationStack();
  const permissions = useContext(RoutePermissionContext);

  const debugData = useMemo(() => ({
    currentUser: {
      decodedAccessToken: identity,
    },
    currentImpersonatedUser: maskImpersonatedUser(userContext.impersonatedUser),
    frontendContext: {
      apiData: {
        ...userContext.config.apiData,
        apiAuthHeaderValue: maskToken(userContext.config.apiData.apiAuthHeaderValue),
        apiRefreshToken: maskToken(userContext.config.apiData.apiRefreshToken),
      },
      storedImpersonation: maskImpersonatedUser(userContext.impersonatedUser),
      activityStack: {
        depth: navigationStack.depth,
        hasReturn: navigationStack.hasReturn,
        frames: navigationStack.frames,
      },
    },
  }), [identity, navigationStack.depth, navigationStack.frames, navigationStack.hasReturn, userContext.config.apiData, userContext.impersonatedUser]);

  const canImpersonate = identity?.clearance === "SUP" && Boolean(permissions?.realRoutes) && Boolean(permissions?.realCanPerform("impersonation.use"));
  if (!canImpersonate) return null;

  const impersonated = userContext.impersonatedUser;

  return (
    <>
      <Paper
        className={classes.overlay}
        shadow="md"
        p="sm"
        withBorder
        role="button"
        tabIndex={0}
        aria-label={t("nav.impersonate")}
        onClick={() => navigationStack.openActivity({ type: "impersonation.select" })}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigationStack.openActivity({ type: "impersonation.select" });
          }
        }}
        style={{
          position: "fixed",
          top: "var(--kahu-overlay-edge)",
          left: "calc(var(--kahu-module-left) + (100vw - var(--kahu-module-left) - var(--kahu-module-right)) / 2)",
          transform: "translateX(-50%)",
          zIndex: 1200,
          width: "var(--kahu-overlay-width)",
          maxWidth: "calc(100vw - var(--kahu-module-left) - var(--kahu-module-right))",
        }}
      >
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase">{t("impersonation.current")}</Text>
            <Text fw={700}>{impersonated ? impersonated.name || impersonated.login || impersonated.email || impersonated.id : t("impersonation.none")}</Text>
            {impersonated && <Text size="xs" c="dimmed">{impersonated.customerName}</Text>}
          </div>
          <ActionIcon variant="light" color="light.1" onClick={(event) => { event.stopPropagation(); setDebugOpen(true); }} aria-label={t("impersonation.debug")}> 
            <FeatherIcon icon="info" size={16} />
          </ActionIcon>
        </Group>
      </Paper>
      <Modal opened={debugOpen} onClose={() => setDebugOpen(false)} title={t("impersonation.debug")} size="lg" centered zIndex={10000}>
        <Stack>
          <Paper withBorder p="sm" radius="sm" style={{ maxHeight: 520, overflow: "auto", background: "#fbfaff" }}>
            <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </Paper>
        </Stack>
      </Modal>
    </>
  );
}
