import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import FeatherIcon from "feather-icons-react";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { useModuleState } from "../../classes/contexts/ModuleStateContext";
import ApiBroker from "../../primitives/ApiBroker";
import { useI18n } from "../../i18n/I18nContext";
import { shouldShowRequestError } from "../../classes/utils/requestErrors";

type StorefrontMode = "products" | "services";

type StorefrontViewState = {
  mode: StorefrontMode;
  search: string;
};

type ProductRecord = {
  id: string;
  name?: string | null;
  description?: string | null;
  barcodeGTIN?: string | null;
  salePrice?: string | number | null;
  stock?: number | null;
};

type ServiceRecord = {
  id: string;
  name?: string | null;
  description?: string | null;
  basicFee?: string | number | null;
  expectedTime?: number | null;
};

type CatalogItem = {
  id: string;
  kind: StorefrontMode;
  name: string;
  description: string;
  detail: string;
  price: number;
};

type CartItem = CatalogItem & { quantity: number };

const defaultStorefrontViewState: StorefrontViewState = {
  mode: "products",
  search: "",
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const storefrontModes = new Set<StorefrontMode>(["products", "services"]);

const safeMode = (value: unknown): StorefrontMode =>
  typeof value === "string" && storefrontModes.has(value as StorefrontMode) ? value as StorefrontMode : "products";

const parseMoney = (value?: string | number | null) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const raw = String(value).trim();
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const productToCatalogItem = (product: ProductRecord): CatalogItem => ({
  id: product.id,
  kind: "products",
  name: product.name || product.barcodeGTIN || product.id,
  description: product.description || "",
  detail: product.stock === null || product.stock === undefined ? "" : String(product.stock),
  price: parseMoney(product.salePrice),
});

const serviceToCatalogItem = (service: ServiceRecord): CatalogItem => ({
  id: service.id,
  kind: "services",
  name: service.name || service.id,
  description: service.description || "",
  detail: service.expectedTime ? `${service.expectedTime} min` : "",
  price: parseMoney(service.basicFee),
});

export default function Storefront({ initialMode }: { initialMode?: StorefrontMode }) {
  const userContext = useContext(UserContext) as UserContextInterface;
  const broker = useMemo(() => new ApiBroker(userContext.config.apiData), [userContext.config.apiData]);
  const { t } = useI18n();

  const [viewState, setViewState] = useModuleState<StorefrontViewState>("storefront.view", defaultStorefrontViewState);
  const mode = safeMode(viewState?.mode);
  const search = typeof viewState?.search === "string" ? viewState.search : "";
  const setMode = (nextMode: StorefrontMode) => setViewState((current) => ({ ...defaultStorefrontViewState, ...current, mode: nextMode }));
  const setSearch = (nextSearch: string) => setViewState((current) => ({ ...defaultStorefrontViewState, ...current, search: nextSearch }));

  useEffect(() => {
    if (initialMode && initialMode !== mode) {
      setMode(initialMode);
    }
  }, [initialMode, mode]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  const notifyError = useCallback(
    (title: string, error: unknown) => {
      if (!shouldShowRequestError(error)) return;
      notifications.show({
        color: "red",
        title,
        message: error instanceof Error ? error.message : t("common.error.requestFailed"),
        position: "top-center",
      });
    },
    [t]
  );

  const loadCatalog = useCallback(async () => {
    setLoading(true);

    const [productResult, serviceResult] = await Promise.allSettled([
      broker.getData({
        route: "/api/products",
        method: "GET",
        query: { pageSize: 100, pageIndex: 0, orders: [{ f: "name", d: "ASC" }], filters: [] },
      }),
      broker.getData({
        route: "/api/services",
        method: "GET",
        query: { pageSize: 100, pageIndex: 0, orders: [{ f: "name", d: "ASC" }], filters: [] },
      }),
    ]);

    if (productResult.status === "fulfilled") {
      setProducts(productResult.value.data as ProductRecord[]);
    } else {
      setProducts([]);
      notifyError(t("storefront.errors.loadProducts"), productResult.reason);
    }

    if (serviceResult.status === "fulfilled") {
      setServices(serviceResult.value.data as ServiceRecord[]);
    } else {
      setServices([]);
      notifyError(t("storefront.errors.loadServices"), serviceResult.reason);
    }

    setLoading(false);
  }, [broker, notifyError, t]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const catalogItems = useMemo(() => {
    const source = mode === "services" ? services.map(serviceToCatalogItem) : products.map(productToCatalogItem);
    const term = search.trim().toLowerCase();
    if (!term) return source;
    return source.filter((item) => [item.name, item.description, item.detail].join(" ").toLowerCase().includes(term));
  }, [mode, products, search, services]);

  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  const addToCart = (item: CatalogItem) => {
    setCart((current) => {
      const key = `${item.kind}:${item.id}`;
      const existing = current.find((cartItem) => `${cartItem.kind}:${cartItem.id}` === key);
      if (existing) {
        return current.map((cartItem) => `${cartItem.kind}:${cartItem.id}` === key ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem);
      }
      return [...current, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (item: CartItem, quantity: number) => {
    const key = `${item.kind}:${item.id}`;
    setCart((current) => current.flatMap((cartItem) => {
      if (`${cartItem.kind}:${cartItem.id}` !== key) return [cartItem];
      if (quantity <= 0) return [];
      return [{ ...cartItem, quantity }];
    }));
  };

  const removeFromCart = (item: CartItem) => {
    const key = `${item.kind}:${item.id}`;
    setCart((current) => current.filter((cartItem) => `${cartItem.kind}:${cartItem.id}` !== key));
  };

  return (
    <Stack gap="md" style={{ width: "100%", height: "calc(100vh - 60px)", minHeight: 0 }}>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t("storefront.title")}</Title>
          <Text c="dimmed">{t("storefront.subtitle")}</Text>
        </div>
        <Button color="light.1" leftSection={<FeatherIcon icon="refresh-cw" size={16} />} onClick={() => void loadCatalog()}>
          {t("storefront.refresh")}
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <Stack gap="md" style={{ minHeight: 0 }}>
          <Paper withBorder radius="sm" p="md" style={{ background: "#fbfaff" }}>
            <Group align="flex-end" justify="space-between" wrap="wrap">
              <SegmentedControl
                color="light.1"
                value={mode}
                onChange={(value) => setMode(safeMode(value))}
                data={[
                  { value: "products", label: t("storefront.products") },
                  { value: "services", label: t("storefront.services") },
                ]}
              />
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder={t("storefront.searchPlaceholder")}
                leftSection={<FeatherIcon icon="search" size={16} />}
                style={{ flex: 1, minWidth: 220 }}
              />
            </Group>
          </Paper>

          <Paper withBorder radius="sm" style={{ overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {loading ? (
              <Group justify="center" p="xl" style={{ flex: 1 }}><Loader color="light.1" /></Group>
            ) : (
              <ScrollArea h="100%" style={{ flex: 1, minHeight: 0 }}>
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead style={{ background: "#f0effa" }}>
                    <Table.Tr>
                      <Table.Th>{t("common.fields.name")}</Table.Th>
                      <Table.Th>{mode === "products" ? t("common.fields.stock") : t("common.fields.expectedTime")}</Table.Th>
                      <Table.Th>{t("storefront.price")}</Table.Th>
                      <Table.Th style={{ width: 72, textAlign: "right" }}>{t("tutors.actions")}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {catalogItems.map((item) => (
                      <Table.Tr key={`${item.kind}:${item.id}`}>
                        <Table.Td>
                          <Text fw={700}>{item.name}</Text>
                          {item.description && <Text size="xs" c="dimmed">{item.description}</Text>}
                        </Table.Td>
                        <Table.Td>{item.detail ? item.detail : "-"}</Table.Td>
                        <Table.Td>{currency.format(item.price)}</Table.Td>
                        <Table.Td>
                          <Group justify="flex-end">
                            <Tooltip label={t("storefront.addToCart")} position="top" zIndex={1600} withinPortal>
                              <ActionIcon variant="light" color="light.1" onClick={() => addToCart(item)} aria-label={t("storefront.addToCart")}>
                                <FeatherIcon icon="plus" size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {!catalogItems.length && (
                      <Table.Tr>
                        <Table.Td colSpan={4}><Text ta="center" c="dimmed" py="xl">{t("storefront.emptyCatalog")}</Text></Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Paper>
        </Stack>

        <Paper withBorder radius="sm" p="md" style={{ minHeight: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <Group justify="space-between" mb="sm">
            <div>
              <Title order={3}>{t("storefront.cart")}</Title>
              <Text c="dimmed" size="sm">{t("storefront.cartItems", { count: String(itemCount) })}</Text>
            </div>
            <Badge color="light.1" variant="light">{currency.format(subtotal)}</Badge>
          </Group>

          <ScrollArea h="100%" style={{ flex: 1, minHeight: 0 }}>
            <Stack gap="xs">
              {cart.map((item) => (
                <Paper key={`${item.kind}:${item.id}`} withBorder radius="sm" p="sm">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <div style={{ minWidth: 0 }}>
                      <Text fw={700}>{item.name}</Text>
                      <Text size="xs" c="dimmed">{currency.format(item.price)} · {item.kind === "products" ? t("storefront.product") : t("storefront.service")}</Text>
                    </div>
                    <ActionIcon variant="subtle" color="red" onClick={() => removeFromCart(item)} aria-label={t("storefront.removeItem")}>
                      <FeatherIcon icon="trash-2" size={16} />
                    </ActionIcon>
                  </Group>
                  <Group justify="space-between" mt="sm">
                    <NumberInput
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(value) => updateQuantity(item, Number(value) || 0)}
                      w={110}
                    />
                    <Text fw={700}>{currency.format(item.price * item.quantity)}</Text>
                  </Group>
                </Paper>
              ))}
              {!cart.length && <Text c="dimmed" ta="center" py="xl">{t("storefront.emptyCart")}</Text>}
            </Stack>
          </ScrollArea>

          <Stack gap="xs" mt="md">
            <Group justify="space-between">
              <Text c="dimmed">{t("storefront.subtotal")}</Text>
              <Text fw={700}>{currency.format(subtotal)}</Text>
            </Group>
            <Group justify="flex-end">
              <Button variant="subtle" color="light.1" disabled={!cart.length} onClick={() => setCart([])}>
                {t("storefront.clearCart")}
              </Button>
              <Button color="light.1" disabled={!cart.length} leftSection={<FeatherIcon icon="shopping-cart" size={16} />}>
                {t("storefront.reviewSale")}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
