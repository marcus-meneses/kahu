import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Center,
  Group,
  Image,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import FeatherIcon from "feather-icons-react";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { shouldShowRequestError } from "../../classes/utils/requestErrors";
import { useI18n } from "../../i18n/I18nContext";
import ApiBroker from "../../primitives/ApiBroker";
import { TomaStatusOverlay } from "../servicekanban/TomaStatusOverlay";
import classes from "./PresaleTracking.module.css";

type ItemStatus = "QUEUED" | "PERFORMING" | "FINALIZED";
type TrackingItem = {
  id: string;
  status: ItemStatus;
  objectType: "Product" | "Service" | "Checkin";
  quantity: number;
  description: string | null;
  animal: {
    id: string;
    name: string | null;
    speciesText: string | null;
    breedText: string | null;
    picture: string | null;
  } | null;
};
type TrackingPresale = {
  id: string;
  numericId: string | number;
  dateTime: string;
  totalAmount: string | number;
  description: string | null;
  tutor: { id: string; name: string | null };
  items: TrackingItem[];
};
type AnimalGroup = { key: string; animal: TrackingItem["animal"]; items: TrackingItem[] };

const statusColor: Record<ItemStatus, string> = {
  QUEUED: "gray",
  PERFORMING: "violet",
  FINALIZED: "green",
};

function dominantStatus(items: TrackingItem[]): ItemStatus {
  if (items.some((item) => item.status === "PERFORMING")) return "PERFORMING";
  if (items.some((item) => item.status === "QUEUED")) return "QUEUED";
  return "FINALIZED";
}

function groupAnimals(items: TrackingItem[]): AnimalGroup[] {
  const groups = new Map<string, AnimalGroup>();
  for (const item of items) {
    const key = item.animal?.id ?? `item-${item.id}`;
    const current = groups.get(key);
    if (current) current.items.push(item);
    else groups.set(key, { key, animal: item.animal, items: [item] });
  }
  return [...groups.values()];
}

function CheckinElapsed({ startedAt }: { startedAt: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
  const days = Math.floor(elapsedMinutes / 1440);
  const hours = Math.floor((elapsedMinutes % 1440) / 60);
  const minutes = elapsedMinutes % 60;
  const value = days > 0
    ? days + "d " + hours + "h"
    : hours > 0
      ? hours + "h " + minutes + "min"
      : elapsedMinutes > 0 ? minutes + "min" : t("tracking.elapsed.now");

  return (
    <Tooltip label={t("tracking.elapsed.tooltip")}>
      <Group gap={4} wrap="nowrap">
        <FeatherIcon icon="clock" size={13} />
        <Text size="xs" fw={700}>{value}</Text>
      </Group>
    </Tooltip>
  );
}

function AnimalPicture({ animal, broker }: { animal: NonNullable<TrackingItem["animal"]>; broker: ApiBroker }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!animal.picture) return;
    let active = true;
    let objectUrl: string | null = null;
    void broker.getBlob(`/api/animals/${animal.id}/image/content`).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [animal.id, animal.picture, broker]);

  if (url) return <Image src={url} alt={animal.name ?? ""} className={classes.image} />;
  return (
    <Center className={classes.image}>
      <Avatar size={64} radius="xl" color="violet">{animal.name?.trim().charAt(0).toUpperCase() || "?"}</Avatar>
    </Center>
  );
}

export default function PresaleTracking() {
  const userContext = useContext(UserContext) as UserContextInterface;
  const broker = useMemo(() => new ApiBroker(userContext.config.getApiData()), [userContext.config]);
  const { locale, t } = useI18n();
  const [presales, setPresales] = useState<TrackingPresale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await broker.getDataPlain({ route: "/api/presales?tracking=true", method: "GET" }) as { data: TrackingPresale[] };
      setPresales(response.data);
      setFailed(false);
    } catch (error) {
      setFailed(true);
      if (!silent && shouldShowRequestError(error)) {
        notifications.show({ color: "red", title: t("tracking.errors.load"), message: error instanceof Error ? error.message : t("common.error.requestFailed") });
      }
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }, [broker, t]);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(true), 30_000);
    const resync = () => void load(true);
    const invalidate = (event: Event) => {
      const detail = (event as CustomEvent<{ scope?: string }>).detail;
      if (detail?.scope === "main") void load(true);
    };
    window.addEventListener("kahu:toma-resync", resync);
    window.addEventListener("kahu:toma-invalidation", invalidate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("kahu:toma-resync", resync);
      window.removeEventListener("kahu:toma-invalidation", invalidate);
    };
  }, [load]);

  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }), [locale]);

  return (
    <Stack gap="lg" className={classes.page}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{t("tracking.title")}</Title>
          <Text c="dimmed">{t("tracking.subtitle")}</Text>
        </div>
        <Tooltip label={t("dashboard.refresh")}>
          <ActionIcon variant="light" size="lg" onClick={() => void load()} loading={refreshing} aria-label={t("dashboard.refresh")}>
            <FeatherIcon icon="refresh-cw" size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : failed && presales.length === 0 ? (
        <Alert color="red" title={t("tracking.errors.load")} icon={<FeatherIcon icon="alert-circle" size={18} />}>
          <Button mt="sm" size="xs" variant="light" onClick={() => void load()}>{t("dashboard.refresh")}</Button>
        </Alert>
      ) : presales.length === 0 ? (
        <Paper withBorder radius="md" p="xl">
          <Center><Stack align="center" gap="xs"><FeatherIcon icon="check-circle" size={36} /><Text c="dimmed">{t("tracking.empty")}</Text></Stack></Center>
        </Paper>
      ) : (
        <div className={classes.cardGrid}>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, xl: 4 }} spacing="lg">
            {presales.flatMap((presale) => groupAnimals(presale.items).map((group) => ({ presale, group }))).map(({ presale, group }) => {
              const status = dominantStatus(group.items);
              return (
                <Paper key={presale.id + "-" + group.key} radius="sm" className={classes.animalCard}>
                  {group.animal ? <AnimalPicture animal={group.animal} broker={broker} /> : (
                    <Center className={classes.image}><FeatherIcon icon="help-circle" size={42} /></Center>
                  )}
                  <Stack gap="xs" className={classes.cardBody}>
                    <Text fw={800} size="lg" className={classes.animalName}>{group.animal?.name || t("tracking.noAnimal")}</Text>
                    {group.animal && <Text size="sm" c="dimmed">{[group.animal.speciesText, group.animal.breedText].filter(Boolean).join(" · ") || t("tracking.unspecifiedBreed")}</Text>}
                    <Text size="sm" fw={600}>{presale.tutor?.name || t("tracking.unnamedTutor")}</Text>
                    <Group justify="space-between" gap="sm" wrap="nowrap">
                      <Text size="xs" c="dimmed">{dateTime.format(new Date(presale.dateTime))}</Text>
                      <CheckinElapsed startedAt={presale.dateTime} />
                    </Group>
                    <Badge size="sm" color={statusColor[status]} variant="light" className={classes.statusBadge}>{t(`tracking.status.${status}` as "tracking.status.QUEUED")}</Badge>
                    <div className={classes.itemList}>
                      {group.items.map((item) => (
                        <Text key={item.id} size="sm" className={classes.itemLine}>{item.description || item.objectType}</Text>
                      ))}
                    </div>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        </div>
      )}
      <TomaStatusOverlay />
    </Stack>
  );
}
