import { useContext, useEffect, useMemo, useState } from "react";
import { Button, Collapse, Group, Loader, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import ApiBroker from "../../primitives/ApiBroker";
import { shouldShowRequestError } from "../../classes/utils/requestErrors";
import LoginBroker from "../../classes/brokers/LoginBroker";
import { ImpersonatedUser, UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { useI18n } from "../../i18n/I18nContext";
import { NavigationFrame, useNavigationStack } from "../../classes/contexts/NavigationStackContext";
import { ActivityModal, SecondaryModal } from "../activity/ActivityModal";

 type CustomerRecord = {
  id: string;
  name?: string | null;
  fiscalName?: string | null;
  email?: string | null;
  cityId?: string | null;
};

type UserRecord = {
  id: string;
  numericId?: number | null;
  customerId: string;
  employeeId?: string | null;
  login?: string | null;
  name?: string | null;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PendingSelection = { customer: CustomerRecord; user: UserRecord };

const displayCustomer = (customer: CustomerRecord): string =>
  customer.name || customer.fiscalName || customer.email || customer.id;

const displayUser = (user: UserRecord): string =>
  user.name || user.login || user.email || user.id;

const displayValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === "" ? "-" : String(value);

const displayDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
};

const formatCpf = (value: string | null | undefined): string => {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : displayValue(value);
};

const Detail = ({ label, value, full = false }: { label: string; value: string | number | null | undefined; full?: boolean }) => (
  <div style={{ minWidth: 0, gridColumn: full ? "1 / -1" : undefined, padding: "8px 0", borderBottom: "1px solid #eceaf2" }}>
    <Text size="xs" c="dimmed" tt="uppercase">{label}</Text>
    <Text fw={650} style={{ overflowWrap: "anywhere" }}>{displayValue(value)}</Text>
  </div>
);

export default function ImpersonationModal({ activityFrame, activityLayer }: { activityFrame: NavigationFrame; activityLayer: number }) {
  const userContext = useContext(UserContext) as UserContextInterface;
  const broker = useMemo(() => new ApiBroker(userContext.config.apiData), [userContext.config.apiData]);
  const loginBroker = useMemo(() => new LoginBroker(userContext.config.apiData), [userContext.config.apiData]);
  const { t } = useI18n();
  const { closeActivityFrame } = useNavigationStack();
  const opened = true;
  const onClose = () => closeActivityFrame(activityFrame.id);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [usersByCustomer, setUsersByCustomer] = useState<Record<string, UserRecord[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    if (!opened || customersLoaded || loadingCustomers) return;

    setLoadingCustomers(true);
    broker
      .getData({
        route: "/api/customers",
        method: "GET",
        query: { pageSize: 100, pageIndex: 0, orders: [], filters: [] },
        impersonate: false,
      })
      .then((response) => {
        setCustomers(response.data as CustomerRecord[]);
        setCustomersLoaded(true);
      })
      .catch((error) => {
        if (!shouldShowRequestError(error)) return;
        notifications.show({
          color: "red",
          title: t("impersonation.loadCustomersError"),
          message: error instanceof Error ? error.message : t("common.error.requestFailed"),
          position: "top-center",
        });
      })
      .finally(() => setLoadingCustomers(false));
  }, [broker, customersLoaded, loadingCustomers, opened, t]);

  const filteredCustomers = customers.filter((customer) =>
    displayCustomer(customer).toLowerCase().includes(search.toLowerCase())
  );

  const closeModal = () => {
    setPendingSelection(null);
    onClose();
  };

  const toggleCustomer = (customer: CustomerRecord) => {
    const nextExpanded = expandedCustomerId === customer.id ? null : customer.id;
    setExpandedCustomerId(nextExpanded);

    if (!nextExpanded || usersByCustomer[customer.id] || loadingUsers[customer.id]) return;

    setLoadingUsers((current) => ({ ...current, [customer.id]: true }));
    broker
      .getData({
        route: `/api/users/by-customer/${customer.id}`,
        method: "GET",
        query: { pageSize: 100, pageIndex: 0, orders: [], filters: [] },
        impersonate: false,
      })
      .then((response) => {
        setUsersByCustomer((current) => ({ ...current, [customer.id]: response.data as UserRecord[] }));
      })
      .catch((error) => {
        if (!shouldShowRequestError(error)) return;
        notifications.show({
          color: "red",
          title: t("impersonation.loadUsersError"),
          message: error instanceof Error ? error.message : t("common.error.requestFailed"),
          position: "top-center",
        });
      })
      .finally(() => {
        setLoadingUsers((current) => ({ ...current, [customer.id]: false }));
      });
  };

  const impersonate = async () => {
    if (!pendingSelection) return;
    const { customer, user } = pendingSelection;
    setImpersonating(true);
    try {
      const response = await loginBroker.impersonate({
        route: userContext.config.routesData.impersonate,
        data: { userId: user.id },
      });

      const nextUser: ImpersonatedUser = {
        id: response.impersonatedUser.id,
        customerId: response.impersonatedUser.customerId,
        customerName: displayCustomer(customer),
        cityId: customer.cityId,
        login: response.impersonatedUser.login ?? user.login,
        name: user.name,
        email: response.impersonatedUser.email ?? user.email,
        accessToken: response.accessToken,
        expiresIn: response.expiresIn,
      };

      userContext.setImpersonatedUser(nextUser);
      setPendingSelection(null);
      onClose();
    } catch (error) {
      if (!shouldShowRequestError(error)) return;
      notifications.show({
        color: "red",
        title: t("impersonation.error"),
        message: error instanceof Error ? error.message : t("common.error.requestFailed"),
        position: "top-center",
      });
    } finally {
      setImpersonating(false);
    }
  };

  return (
    <>
      <ActivityModal opened={opened} onClose={closeModal} title={t("impersonation.title")} size="lg" centered layer={activityLayer}>
        <Stack>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{t("impersonation.selectHint")}</Text>
            <Button variant="light" color="red" onClick={() => { userContext.setImpersonatedUser(null); closeModal(); }}>
              {t("impersonation.clear")}
            </Button>
          </Group>
          <TextInput placeholder={t("impersonation.searchCustomers")} value={search} onChange={(event) => setSearch(event.currentTarget.value)} />

          {loadingCustomers && <Loader color="light.1" />}

          <Stack gap="xs" style={{ height: 420, overflowY: "auto" }}>
            {filteredCustomers.map((customer) => {
              const users = usersByCustomer[customer.id] ?? [];
              const expanded = expandedCustomerId === customer.id;
              return (
                <div key={customer.id} style={{ border: "1px solid #dee2e6", borderRadius: 6, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => toggleCustomer(customer)}
                    style={{ width: "100%", border: 0, background: "white", padding: "10px 12px", textAlign: "left", cursor: "pointer" }}
                  >
                    <Text fw={700}>{displayCustomer(customer)}</Text>
                    <Text size="xs" c="dimmed">{customer.id}</Text>
                  </button>
                  <Collapse in={expanded}>
                    <Stack gap={0} p="xs" style={{ background: "#f8f9fa" }}>
                      {loadingUsers[customer.id] && <Loader size="sm" color="light.1" />}
                      {!loadingUsers[customer.id] && users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setPendingSelection({ customer, user })}
                          style={{ border: 0, background: "transparent", padding: "8px 10px", textAlign: "left", cursor: "pointer", borderRadius: 4 }}
                        >
                          <Text fw={600}>{displayUser(user)}</Text>
                          <Text size="xs" c="dimmed">{user.login || user.email || user.id}</Text>
                        </button>
                      ))}
                      {!loadingUsers[customer.id] && !users.length && <Text size="sm" c="dimmed">{t("impersonation.noUsers")}</Text>}
                    </Stack>
                  </Collapse>
                </div>
              );
            })}
          </Stack>
        </Stack>
      </ActivityModal>

      <SecondaryModal
        opened={Boolean(pendingSelection)}
        onClose={() => setPendingSelection(null)}
        title={t("impersonation.confirmTitle")}
        size="lg"
        centered
        zIndex={1600}
      >
        {pendingSelection && (
          <Stack gap="md">
            <div>
              <Text fw={750} size="lg">{displayUser(pendingSelection.user)}</Text>
              <Text size="sm" c="dimmed">{displayCustomer(pendingSelection.customer)}</Text>
            </div>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="0 24px">
              <Detail label={t("common.fields.name")} value={pendingSelection.user.name} />
              <Detail label={t("common.fields.login")} value={pendingSelection.user.login} />
              <Detail label={t("common.fields.email")} value={pendingSelection.user.email} />
              <Detail label={t("common.fields.phone")} value={pendingSelection.user.phone} />
              <Detail label={t("common.fields.cpf")} value={formatCpf(pendingSelection.user.cpf)} />
              <Detail label={t("impersonation.status")} value={pendingSelection.user.status} />
              <Detail label={t("impersonation.userId")} value={pendingSelection.user.id} full />
              <Detail label={t("impersonation.numericId")} value={pendingSelection.user.numericId} />
              <Detail label={t("impersonation.employeeId")} value={pendingSelection.user.employeeId} />
              <Detail label={t("impersonation.customerId")} value={pendingSelection.user.customerId} full />
              <Detail label={t("impersonation.createdAt")} value={displayDate(pendingSelection.user.createdAt)} />
              <Detail label={t("impersonation.updatedAt")} value={displayDate(pendingSelection.user.updatedAt)} />
            </SimpleGrid>
            <Group justify="flex-end">
              <Button variant="subtle" color="light.1" disabled={impersonating} onClick={() => setPendingSelection(null)}>
                {t("common.actions.cancel")}
              </Button>
              <Button color="light.1" loading={impersonating} onClick={() => void impersonate()}>
                {t("impersonation.confirm")}
              </Button>
            </Group>
          </Stack>
        )}
      </SecondaryModal>
    </>
  );
}
