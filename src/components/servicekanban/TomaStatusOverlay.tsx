import { useContext, useState } from "react";
import { ActionIcon, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import FeatherIcon from "feather-icons-react";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { useTomaDiagnostics } from "../../classes/realtime/TomaDiagnostics";
import { decodeAccessToken } from "../../classes/utils/auth";
import { useI18n } from "../../i18n/I18nContext";
import classes from "./TomaStatusOverlay.module.css";

const statusKeys = {
  idle: "toma.status.idle",
  connecting: "toma.status.connecting",
  connected: "toma.status.connected",
  reconnecting: "toma.status.reconnecting",
  disconnected: "toma.status.disconnected",
} as const;

export function TomaStatusOverlay() {
  const context = useContext(UserContext) as UserContextInterface;
  const identity = decodeAccessToken(context.config.apiData.apiAuthHeaderValue);
  const diagnostics = useTomaDiagnostics();
  const [opened, setOpened] = useState(false);
  const { t } = useI18n();

  if (identity?.clearance !== "SUP") return null;

  return <>
    <Paper className={classes.overlay} shadow="md" p="xs" withBorder>
      <Group gap="xs" wrap="nowrap">
        <span className={classes.indicator} data-status={diagnostics.status} />
        <div className={classes.label}>
          <Text size="xs" c="dimmed" tt="uppercase">Toma</Text>
          <Text size="sm" fw={700}>{t(statusKeys[diagnostics.status])}</Text>
        </div>
        <ActionIcon variant="light" color="light.1" onClick={() => setOpened(true)} aria-label={t("toma.info")}>
          <FeatherIcon icon="info" size={16} />
        </ActionIcon>
      </Group>
    </Paper>
    <Modal opened={opened} onClose={() => setOpened(false)} title={t("toma.connectionInfo")} size="lg" centered>
      <Stack gap="sm">
        <Paper withBorder p="sm" radius="sm" className={classes.details}>
          <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
        </Paper>
      </Stack>
    </Modal>
  </>;
}
