import { Stack, Text, Title } from "@mantine/core";
import { useI18n } from "../../i18n/I18nContext";

export default function Dashboard() {
  const { t } = useI18n();

  return (
    <Stack gap="md" style={{ width: "100%", minHeight: "calc(100vh - 60px)" }}>
      <div>
        <Title order={2}>{t("dashboard.title")}</Title>
        <Text c="dimmed">{t("dashboard.subtitle")}</Text>
      </div>
    </Stack>
  );
}
