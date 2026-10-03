import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Badge, Button, FileButton, Group, Loader, Modal, NumberInput, Paper, ScrollArea, SegmentedControl, Select, SimpleGrid, Stack, Table, Text, TextInput, Textarea, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMediaQuery } from "@mantine/hooks";
import FeatherIcon from "feather-icons-react";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import ApiBroker from "../../primitives/ApiBroker";
import { useI18n } from "../../i18n/I18nContext";
import { shouldShowRequestError } from "../../classes/utils/requestErrors";

type Mode = "products" | "services";
type ProductDestination = "resale" | "consumption_services" | "consumption_daily";
type Product = { id: string; destination: ProductDestination; barcodeGTIN: string | null; name: string | null; description: string | null; unitId: string; acquisitionPrice: string | number | null; salePrice: string | number | null; stock: number | null; minimumStock: number | null; profitMargin: string | number | null; NCM: string | null; fiscalNCMId: string | null; categoryId: string; customerId: string };
type Service = { id: string; name: string | null; description: string | null; expectedTime: number | null; basicCost: string | number | null; basicFee: string | number | null; code: string | null; fiscalNBSId: string; categoryId: string; customerId: string };
type NbsRecord = { id: string; parent: string | null; code: string; description: string };
type NcmRecord = NbsRecord;
type OptionRecord = { id: string; name?: string | null; abbreviation?: string | null; parentId?: string | null };
type ProductDraft = Omit<Product, "id" | "destination"> & { id?: string; destination: ProductDestination | "" };
type ServiceDraft = Omit<Service, "id"> & { id?: string };
type NfePreprocessedItem = { key: string; sourceCode: string; barcodeGTIN: string; name: string; description: string; quantity: number; unitPrice: string | null; currentMeanUnitCost: string | number | null; unitCostDiffers: boolean; ncm: string; fiscalNCMId: string | null; fiscalNCM: NcmRecord | null; unitId: string | null; existingProductId: string | null; existingProduct: Product | null; inventoryAction: "INSERTION" | "REPLENISHMENT"; issues: string[] };
type NfePreprocessed = { accessKey: string; duplicateNote: boolean; previousImport?: { importCount: number; firstImportedAt: string; lastImportedAt: string } | null; items: NfePreprocessedItem[] };
type ImportedProduct = { key: string; quantity: number; currentMeanUnitCost: string | number | null; draft: ProductDraft; existingId?: string; sourceCode: string; inventoryAction: "INSERTION" | "REPLENISHMENT"; approved: boolean };

const blankProduct = (customerId = ""): ProductDraft => ({ destination: "", barcodeGTIN: "", name: "", description: "", unitId: "", acquisitionPrice: null, salePrice: null, stock: 0, minimumStock: 0, profitMargin: null, NCM: "", fiscalNCMId: null, categoryId: "", customerId });
const blankService = (customerId = ""): ServiceDraft => ({ name: "", description: "", expectedTime: null, basicCost: null, basicFee: null, code: "", fiscalNBSId: "", categoryId: "", customerId });
const listQuery = { pageSize: 500, pageIndex: 0, orders: [{ f: "name", d: "ASC" as const }], filters: [] };
const numberOrNull = (value: string | number | null | undefined) => value === "" || value === null || value === undefined ? null : String(value);
const marginFromPrices = (acquisitionPrice: string | number | null, salePrice: string | number | null) => {
  const acquisition = Number(acquisitionPrice);
  const sale = Number(salePrice);
  return Number.isFinite(acquisition) && Number.isFinite(sale) && acquisition > 0 ? ((sale - acquisition) / acquisition) * 100 : null;
};
const salePriceFromMargin = (acquisitionPrice: string | number | null, profitMargin: string | number | null) => {
  const acquisition = Number(acquisitionPrice);
  const margin = Number(profitMargin);
  if (acquisitionPrice === null || acquisitionPrice === "" || profitMargin === null || profitMargin === "" || !Number.isFinite(acquisition) || !Number.isFinite(margin) || margin < 0) return null;
  return Number((acquisition * (1 + margin / 100)).toFixed(2));
};
const normalizeProductPricing = <T extends ProductDraft>(product: T): T => {
  const profitMargin = product.profitMargin ?? marginFromPrices(product.acquisitionPrice, product.salePrice);
  return { ...product, profitMargin, salePrice: profitMargin === null ? product.salePrice : salePriceFromMargin(product.acquisitionPrice, profitMargin) } as T;
};
const importedUnitCostDiffers = (item: ImportedProduct) => item.currentMeanUnitCost !== null && item.draft.acquisitionPrice !== null
  && Math.round(Number(item.currentMeanUnitCost) * 100) !== Math.round(Number(item.draft.acquisitionPrice) * 100);
const formatUnitCost = (value: string | number | null) => value === null ? "-" : Number(value).toFixed(2).replace(".", ",");
const projectedMeanUnitCost = (currentMean: string | number | null, currentStock: number | null, quantity: number, incomingCost: string | number | null) => {
  const incoming = Number(incomingCost);
  const stock = Number(currentStock ?? 0);
  const mean = Number(currentMean);
  if (incomingCost === null || !Number.isFinite(incoming)) return null;
  return stock > 0 && currentMean !== null && Number.isFinite(mean)
    ? Number((((stock * mean) + (quantity * incoming)) / (stock + quantity)).toFixed(2))
    : Number(incoming.toFixed(2));
};

export default function StockModule() {
  const context = useContext(UserContext) as UserContextInterface;
  const broker = useMemo(() => new ApiBroker(context.config.apiData), [context.config.apiData]);
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [productCategories, setProductCategories] = useState<OptionRecord[]>([]);
  const [serviceCategories, setServiceCategories] = useState<OptionRecord[]>([]);
  const [units, setUnits] = useState<OptionRecord[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [product, setProduct] = useState<ProductDraft>(blankProduct());
  const [service, setService] = useState<ServiceDraft>(blankService());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [selectedImportKey, setSelectedImportKey] = useState<string | null>(null);
  const [importEditorOpen, setImportEditorOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importAccessKey, setImportAccessKey] = useState("");
  const [duplicateNfePending, setDuplicateNfePending] = useState<NfePreprocessed | null>(null);
  const [removeImportTarget, setRemoveImportTarget] = useState<ImportedProduct | null>(null);
  const [narrowFormOpen, setNarrowFormOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState<Set<string>>(new Set());
  const [categoryCandidate, setCategoryCandidate] = useState<OptionRecord | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [nbsModalOpen, setNbsModalOpen] = useState(false);
  const [nbsItems, setNbsItems] = useState<NbsRecord[]>([]);
  const [nbsChildren, setNbsChildren] = useState<Record<string, NbsRecord[]>>({});
  const [nbsExpanded, setNbsExpanded] = useState<Set<string>>(new Set());
  const [nbsCandidate, setNbsCandidate] = useState<NbsRecord | null>(null);
  const [nbsSearch, setNbsSearch] = useState("");
  const [nbsShowingSelection, setNbsShowingSelection] = useState(false);
  const [nbsLoading, setNbsLoading] = useState(false);
  const [nbsById, setNbsById] = useState<Record<string, NbsRecord>>({});
  const [ncmModalOpen, setNcmModalOpen] = useState(false);
  const [ncmItems, setNcmItems] = useState<NcmRecord[]>([]);
  const [ncmChildren, setNcmChildren] = useState<Record<string, NcmRecord[]>>({});
  const [ncmExpanded, setNcmExpanded] = useState<Set<string>>(new Set());
  const [ncmCandidate, setNcmCandidate] = useState<NcmRecord | null>(null);
  const [ncmSearch, setNcmSearch] = useState("");
  const [ncmShowingSelection, setNcmShowingSelection] = useState(false);
  const [ncmLoading, setNcmLoading] = useState(false);
  const [ncmById, setNcmById] = useState<Record<string, NcmRecord>>({});
  const isNarrow = useMediaQuery("(max-width: 61.99em)");
  const resetFile = useRef<() => void>(null);

  const error = useCallback((title: string, reason: unknown) => {
    if (!shouldShowRequestError(reason)) return;
    notifications.show({ color: "red", title, message: reason instanceof Error ? reason.message : t("common.error.requestFailed"), position: "top-center" });
  }, [t]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productResponse, serviceResponse, pcResponse, scResponse, unitResponse, meResponse] = await Promise.all([
        broker.getData({ route: "/api/products", method: "GET", query: listQuery }),
        broker.getData({ route: "/api/services", method: "GET", query: listQuery }),
        broker.getData({ route: "/api/product-categories", method: "GET", query: listQuery }),
        broker.getData({ route: "/api/service-categories", method: "GET", query: listQuery }),
        broker.getData({ route: "/api/units", method: "GET", query: listQuery }),
        broker.getDataPlain({ route: "/auth/me", method: "GET" }) as Promise<{ data?: { customerId?: string }; customerId?: string }>,
      ]);
      const effectiveCustomerId = context.impersonatedUser?.customerId || meResponse.data?.customerId || meResponse.customerId || "";
      setCustomerId(effectiveCustomerId);
      setProducts(productResponse.data as Product[]); setServices(serviceResponse.data as Service[]);
      const productRecords = productResponse.data as Product[];
      const ncmRecords = await Promise.all([...new Set(productRecords.map((item) => item.fiscalNCMId).filter((id): id is string => Boolean(id)))].map(async (id) => {
        const response = await broker.getDataPlain({ route: `/api/fiscal-ncms/${id}`, method: "GET" }) as { data?: NcmRecord };
        return response.data;
      }));
      setNcmById(Object.fromEntries(ncmRecords.filter((item): item is NcmRecord => Boolean(item)).map((item) => [item.id, item])));
      const serviceRecords = serviceResponse.data as Service[];
      const nbsRecords = await Promise.all([...new Set(serviceRecords.map((item) => item.fiscalNBSId).filter(Boolean))].map(async (id) => {
        const response = await broker.getDataPlain({ route: `/api/fiscal-nbs/${id}`, method: "GET" }) as { data?: NbsRecord };
        return response.data;
      }));
      setNbsById(Object.fromEntries(nbsRecords.filter((item): item is NbsRecord => Boolean(item)).map((item) => [item.id, item])));
      setProductCategories(pcResponse.data as OptionRecord[]); setServiceCategories(scResponse.data as OptionRecord[]); setUnits(unitResponse.data as OptionRecord[]);
      setProduct(blankProduct(effectiveCustomerId)); setService(blankService(effectiveCustomerId));
    } catch (reason) { error(t("stock.errors.load"), reason); } finally { setLoading(false); }
  }, [broker, context.impersonatedUser?.customerId, error, t]);
  useEffect(() => { void load(); }, [load]);

  const selectedImport = importedProducts.find((item) => item.key === selectedImportKey);
  const pricingUnitCost = selectedImport ? projectedMeanUnitCost(selectedImport.currentMeanUnitCost, product.stock, selectedImport.quantity, product.acquisitionPrice) : product.acquisitionPrice;
  const productErrors = selectedImport ? {
    name: !product.name?.trim(), gtin: !product.barcodeGTIN?.trim(), category: !product.categoryId,
    unit: !product.unitId, destination: !product.destination, ncm: !product.NCM?.trim() || !product.fiscalNCMId, quantity: !Number.isInteger(selectedImport.quantity) || selectedImport.quantity <= 0,
  } : { name: false, gtin: false, category: false, unit: false, destination: false, ncm: false, quantity: false };
  const saveProduct = async () => {
    if (!product.name?.trim() || !product.categoryId || !product.unitId || !product.destination || !product.NCM?.trim() || !product.fiscalNCMId || (selectedImport && (!product.barcodeGTIN?.trim() || !Number.isInteger(selectedImport.quantity) || selectedImport.quantity <= 0))) return error(t("stock.errors.invalid"), new Error(t("stock.errors.requiredProduct")));
    if (selectedImport) {
      const approvedProduct = { ...product, salePrice: salePriceFromMargin(pricingUnitCost, product.profitMargin) };
      setImportedProducts((current) => current.map((item) => item.key === selectedImport.key ? { ...item, draft: approvedProduct, approved: true } : item));
      setImportEditorOpen(false); setNarrowFormOpen(false); setSelectedImportKey(null);
      notifications.show({ color: "green", title: t("stock.productApproved"), message: t("stock.productApprovedMessage"), position: "top-center" });
      return;
    }
    setSaving(true);
    try {
      const data = { ...product, customerId, barcodeGTIN: product.barcodeGTIN?.trim() || null, acquisitionPrice: numberOrNull(product.acquisitionPrice), salePrice: numberOrNull(product.salePrice), profitMargin: product.profitMargin === null ? null : Number(product.profitMargin), stock: product.stock ?? 0, minimumStock: product.minimumStock ?? 0 };
      if (data.id) await broker.putData({ route: "/api/products", data }); else await broker.postData({ route: "/api/products", data });
      notifications.show({ color: "green", title: t("stock.saved"), message: t("stock.productSaved"), position: "top-center" }); await load(); setNarrowFormOpen(false);
    } catch (reason) { error(t("stock.errors.save"), reason); } finally { setSaving(false); }
  };
  const saveService = async () => {
    if (!service.name?.trim() || !service.categoryId || !service.code?.trim() || !service.fiscalNBSId) return error(t("stock.errors.invalid"), new Error(t("stock.errors.requiredService")));
    setSaving(true);
    try {
      const data = { ...service, customerId, basicCost: numberOrNull(service.basicCost), basicFee: numberOrNull(service.basicFee) };
      if (service.id) await broker.putData({ route: "/api/services", data }); else await broker.postData({ route: "/api/services", data });
      notifications.show({ color: "green", title: t("stock.saved"), message: t("stock.serviceSaved"), position: "top-center" }); await load(); setNarrowFormOpen(false);
    } catch (reason) { error(t("stock.errors.save"), reason); } finally { setSaving(false); }
  };

  const stagePreprocessedNfe = (data: NfePreprocessed) => {
    const parsed = data.items.map((item): ImportedProduct => {
      const draft: ProductDraft = item.existingProduct ? normalizeProductPricing({ ...item.existingProduct, acquisitionPrice: item.unitPrice }) : {
        ...blankProduct(customerId), barcodeGTIN: item.barcodeGTIN, name: item.name, description: item.description,
        unitId: item.unitId || "", acquisitionPrice: item.unitPrice, NCM: item.ncm, fiscalNCMId: item.fiscalNCMId,
      };
      if (item.fiscalNCM) setNcmById((current) => ({ ...current, [item.fiscalNCM!.id]: item.fiscalNCM! }));
      return { key: item.key, quantity: item.quantity, currentMeanUnitCost: item.currentMeanUnitCost, draft, existingId: item.existingProductId || undefined, sourceCode: item.sourceCode, inventoryAction: item.inventoryAction, approved: false };
    });
    if (!parsed.length) throw new Error(t("stock.errors.noNfeProducts"));
    setImportAccessKey(data.accessKey); setMode("products"); setImportedProducts(parsed); setSelectedImportKey(null); setImportEditorOpen(false); setProduct(blankProduct(customerId)); setNarrowFormOpen(false); setDuplicateNfePending(null);
    notifications.show({ color: "green", title: t("stock.importPrepared"), message: t("stock.importPreparedCount", { count: String(parsed.length) }), position: "top-center" });
  };
  const importNfe = async (file: File | null) => {
    if (!file) return;
    setImportLoading(true);
    try {
      const response = await broker.uploadFile({ route: "/api/inventory/nfe/preprocess", file, method: "POST" }) as { data?: NfePreprocessed };
      if (!response.data) throw new Error(t("stock.errors.noNfeProducts"));
      if (response.data.duplicateNote) setDuplicateNfePending(response.data); else stagePreprocessedNfe(response.data);
    } catch (reason) { error(t("stock.errors.import"), reason); } finally { setImportLoading(false); resetFile.current?.(); }
  };
  const cancelImport = () => { setImportedProducts([]); setImportAccessKey(""); setSelectedImportKey(null); setImportEditorOpen(false); setProduct(blankProduct(customerId)); setNarrowFormOpen(false); };
  const processImportList = () => { const first = importedProducts[0]; if (!first) return; setSelectedImportKey(first.key); setProduct(first.draft); setImportEditorOpen(true); setNarrowFormOpen(true); };
  const revokeImportApproval = (key: string) => setImportedProducts((current) => current.map((item) => item.key === key ? { ...item, approved: false } : item));
  const removeImportItem = (key: string) => { setImportedProducts((current) => current.filter((item) => item.key !== key)); if (selectedImportKey === key) { setSelectedImportKey(null); setImportEditorOpen(false); setNarrowFormOpen(false); } };
  const applyImportList = async () => {
    const approvedItems = importedProducts.filter((item) => item.approved);
    if (!approvedItems.length) return;
    setSaving(true);
    try {
      await broker.postData({ route: "/api/inventory/nfe/commit", data: { accessKey: importAccessKey, items: approvedItems.map((item) => ({ existingProductId: item.existingId || null, quantity: item.quantity, product: item.draft })) } });
      notifications.show({ color: "green", title: t("stock.listApplied"), message: t("stock.listAppliedMessage", { count: String(approvedItems.length) }), position: "top-center" }); cancelImport(); await load();
    } catch (reason) { error(t("stock.errors.commitImport"), reason); } finally { setSaving(false); }
  };
  const options = (records: OptionRecord[]) => records.map((item) => ({ value: item.id, label: item.name || item.abbreviation || item.id }));
  const activeCategories = mode === "products" ? productCategories : serviceCategories;
  const selectedCategoryId = mode === "products" ? product.categoryId : service.categoryId;
  const selectedCategory = activeCategories.find((item) => item.id === selectedCategoryId);
  const categoryById = useMemo(() => new Map(activeCategories.map((item) => [item.id, item])), [activeCategories]);
  const categoryVisibleIds = useMemo(() => {
    if (!categorySearch.trim()) return new Set(activeCategories.map((item) => item.id));
    const query = categorySearch.trim().toLocaleLowerCase();
    const visible = new Set<string>();
    activeCategories.forEach((item) => {
      if (!(item.name || item.abbreviation || item.id).toLocaleLowerCase().includes(query)) return;
      let current: OptionRecord | undefined = item;
      while (current && !visible.has(current.id)) {
        visible.add(current.id);
        current = current.parentId ? categoryById.get(current.parentId) : undefined;
      }
    });
    return visible;
  }, [activeCategories, categoryById, categorySearch]);
  const categoryChildren = useMemo(() => {
    const children: Record<string, OptionRecord[]> = {};
    activeCategories.forEach((item) => {
      if (!categoryVisibleIds.has(item.id)) return;
      const parentId = item.parentId && categoryVisibleIds.has(item.parentId) ? item.parentId : "__root__";
      (children[parentId] ||= []).push(item);
    });
    return children;
  }, [activeCategories, categoryVisibleIds]);
  const openCategoryModal = () => {
    const expanded = new Set<string>();
    let current = selectedCategory;
    while (current?.parentId) {
      expanded.add(current.parentId);
      current = categoryById.get(current.parentId);
    }
    setCategorySearch("");
    setCategoryExpanded(expanded);
    setCategoryCandidate(selectedCategory || null);
    setCategoryModalOpen(true);
  };
  const activateCategory = (category: OptionRecord) => {
    const hasChildren = activeCategories.some((item) => item.parentId === category.id);
    if (!hasChildren) {
      setCategoryCandidate(category);
      return;
    }
    setCategoryExpanded((current) => {
      const next = new Set(current);
      next.has(category.id) ? next.delete(category.id) : next.add(category.id);
      return next;
    });
  };
  const confirmCategory = () => {
    if (!categoryCandidate) return;
    if (mode === "products") setProduct((current) => ({ ...current, categoryId: categoryCandidate.id }));
    else setService((current) => ({ ...current, categoryId: categoryCandidate.id }));
    setCategoryModalOpen(false);
  };
  const fetchFiscalChildren = async <T extends NbsRecord>(kind: "nbs" | "ncms", record: T): Promise<T[]> => {
    const response = await broker.getData({ route: `/api/fiscal-${kind}/children/${record.id}`, method: "GET", query: { ...listQuery, orders: [{ f: "code", d: "ASC" as const }] } });
    return response.data as T[];
  };
  const centerFiscalNode = (id: string) => window.setTimeout(() => document.getElementById(`fiscal-node-${id}`)?.scrollIntoView({ block: "center" }), 0);
  const loadFiscalRoots = async <T extends NbsRecord>(kind: "nbs" | "ncms"): Promise<T[]> => {
    const response = await broker.getData({ route: `/api/fiscal-${kind}/roots`, method: "GET", query: { ...listQuery, orders: [{ f: "code", d: "ASC" as const }] } });
    return response.data as T[];
  };
  const loadSelectedFiscalTree = async <T extends NbsRecord>(kind: "nbs" | "ncms", selected: T): Promise<T[]> => {
    const chain = [selected];
    let current = selected;
    while (current.parent) {
      const response = await broker.getDataPlain({ route: `/api/fiscal-${kind}/${current.parent}`, method: "GET" }) as { data?: T };
      if (!response.data) break;
      current = response.data; chain.unshift(current);
    }
    return chain;
  };
  const openNbsModal = async () => {
    setNbsSearch(""); setNbsModalOpen(true); setNbsLoading(true); setNbsItems([]); setNbsExpanded(new Set()); setNbsChildren({});
    const selected = nbsById[service.fiscalNBSId];
    if (!selected) { setNbsShowingSelection(false); setNbsCandidate(null); return; }
    setNbsShowingSelection(true);
    try { const [roots, chain] = await Promise.all([loadFiscalRoots<NbsRecord>("nbs"), loadSelectedFiscalTree("nbs", selected)]); showSearchTree([...roots, ...chain], setNbsItems, setNbsChildren, setNbsExpanded); setNbsCandidate(selected); centerFiscalNode(selected.id); }
    catch (reason) { setNbsShowingSelection(false); error(t("stock.errors.loadNbs"), reason); } finally { setNbsLoading(false); }
  };
  const activateNbs = async (record: NbsRecord) => {
    if (nbsChildren[record.id]) {
      if (!nbsChildren[record.id].length) { setNbsCandidate(record); return; }
      setNbsExpanded((current) => { const next = new Set(current); next.has(record.id) ? next.delete(record.id) : next.add(record.id); return next; }); return;
    }
    setNbsLoading(true);
    try { const children = await fetchFiscalChildren("nbs", record); setNbsChildren((current) => ({ ...current, [record.id]: children })); if (children.length) setNbsExpanded((current) => new Set(current).add(record.id)); else setNbsCandidate(record); }
    catch (reason) { error(t("stock.errors.loadNbs"), reason); } finally { setNbsLoading(false); }
  };
  const confirmNbs = () => { if (!nbsCandidate) return; setService((current) => ({ ...current, fiscalNBSId: nbsCandidate.id })); setNbsById((current) => ({ ...current, [nbsCandidate.id]: nbsCandidate })); setNbsModalOpen(false); };
  const openNcmModal = async () => {
    setNcmSearch(""); setNcmModalOpen(true); setNcmLoading(true); setNcmItems([]); setNcmExpanded(new Set()); setNcmChildren({}); setNcmCandidate(null);
    const selectedId = product.fiscalNCMId;
    if (!selectedId) { setNcmShowingSelection(false); return; }
    setNcmShowingSelection(true);
    try {
      let selected = ncmById[selectedId];
      if (!selected) {
        const response = await broker.getDataPlain({ route: `/api/fiscal-ncms/${selectedId}`, method: "GET" }) as { data?: NcmRecord };
        if (!response.data) throw new Error(t("stock.errors.loadNcm"));
        selected = response.data;
        setNcmById((current) => ({ ...current, [selected.id]: selected }));
      }
      const [roots, chain] = await Promise.all([loadFiscalRoots<NcmRecord>("ncms"), loadSelectedFiscalTree("ncms", selected)]);
      showSearchTree([...roots, ...chain], setNcmItems, setNcmChildren, setNcmExpanded);
      setNcmCandidate(selected);
      centerFiscalNode(selected.id);
    } catch (reason) {
      setNcmShowingSelection(false);
      error(t("stock.errors.loadNcm"), reason);
    } finally {
      setNcmLoading(false);
    }
  };
  const activateNcm = async (record: NcmRecord) => {
    if (ncmChildren[record.id]) {
      if (!ncmChildren[record.id].length) { setNcmCandidate(record); return; }
      setNcmExpanded((current) => { const next = new Set(current); next.has(record.id) ? next.delete(record.id) : next.add(record.id); return next; }); return;
    }
    setNcmLoading(true);
    try { const children = await fetchFiscalChildren("ncms", record); setNcmChildren((current) => ({ ...current, [record.id]: children })); if (children.length) setNcmExpanded((current) => new Set(current).add(record.id)); else setNcmCandidate(record); }
    catch (reason) { error(t("stock.errors.loadNcm"), reason); } finally { setNcmLoading(false); }
  };
  const confirmNcm = () => { if (!ncmCandidate) return; setProduct((current) => ({ ...current, fiscalNCMId: ncmCandidate.id, NCM: ncmCandidate.code })); setNcmById((current) => ({ ...current, [ncmCandidate.id]: ncmCandidate })); setNcmModalOpen(false); };
  const showSearchTree = <T extends NbsRecord>(records: T[], setRoots: (records: T[]) => void, setChildren: (children: Record<string, T[]>) => void, setExpanded: (expanded: Set<string>) => void) => {
    const uniqueRecords = [...new Map(records.map((record) => [record.id, record])).values()];
    const ids = new Set(uniqueRecords.map((record) => record.id));
    const children: Record<string, T[]> = {};
    uniqueRecords.forEach((record) => { if (record.parent && ids.has(record.parent)) (children[record.parent] ||= []).push(record); });
    setRoots(uniqueRecords.filter((record) => !record.parent || !ids.has(record.parent)));
    setChildren(children);
    setExpanded(new Set(Object.keys(children)));
  };
  useEffect(() => {
    if (!ncmModalOpen || (ncmShowingSelection && !ncmSearch.trim())) return;
    const timer = window.setTimeout(async () => {
      setNcmLoading(true); setNcmCandidate(null);
      try {
        if (!ncmSearch.trim()) {
          const response = await broker.getData({ route: "/api/fiscal-ncms/roots", method: "GET", query: { ...listQuery, orders: [{ f: "code", d: "ASC" as const }] } });
          setNcmItems(response.data as NcmRecord[]); setNcmChildren({}); setNcmExpanded(new Set());
        } else {
          const response = await broker.getDataPlain({ route: `/api/fiscal-ncms/search?search=${encodeURIComponent(ncmSearch.trim())}&limit=50`, method: "GET" }) as { data?: NcmRecord[] };
          showSearchTree(response.data || [], setNcmItems, setNcmChildren, setNcmExpanded);
        }
      } catch (reason) { error(t("stock.errors.loadNcm"), reason); } finally { setNcmLoading(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [broker, error, ncmModalOpen, ncmSearch, ncmShowingSelection, t]);
  useEffect(() => {
    if (!nbsModalOpen || (nbsShowingSelection && !nbsSearch.trim())) return;
    const timer = window.setTimeout(async () => {
      setNbsLoading(true); setNbsCandidate(null);
      try {
        if (!nbsSearch.trim()) {
          const response = await broker.getData({ route: "/api/fiscal-nbs/roots", method: "GET", query: { ...listQuery, orders: [{ f: "code", d: "ASC" as const }] } });
          setNbsItems(response.data as NbsRecord[]); setNbsChildren({}); setNbsExpanded(new Set());
        } else {
          const response = await broker.getDataPlain({ route: `/api/fiscal-nbs/search?search=${encodeURIComponent(nbsSearch.trim())}&limit=50`, method: "GET" }) as { data?: NbsRecord[] };
          showSearchTree(response.data || [], setNbsItems, setNbsChildren, setNbsExpanded);
        }
      } catch (reason) { error(t("stock.errors.loadNbs"), reason); } finally { setNbsLoading(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [broker, error, nbsModalOpen, nbsSearch, nbsShowingSelection, t]);
  const renderCategoryTree = (records: OptionRecord[], depth = 0): React.ReactNode => records.map((record) => {
    const children = categoryChildren[record.id] || [];
    const expanded = categoryExpanded.has(record.id);
    return <div key={record.id} style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
      <Button id={`category-node-${record.id}`} fullWidth variant={categoryCandidate?.id === record.id ? "light" : "subtle"} color={categoryCandidate?.id === record.id ? "light.1" : "dark"} justify="flex-start" leftSection={<FeatherIcon icon={children.length && expanded ? "chevron-down" : "chevron-right"} size={15} />} style={{ minHeight: 40, height: "auto", borderRadius: 0, paddingLeft: 10 + depth * 20 }} styles={{ inner: { width: "100%", alignItems: "flex-start" }, section: { alignSelf: "flex-start", marginTop: 2 }, label: { width: "100%", whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "left", lineHeight: 1.35 } }} onClick={() => activateCategory(record)}>
        {record.name || record.abbreviation || record.id}
      </Button>
      {expanded && renderCategoryTree(children, depth + 1)}
    </div>;
  });
  const renderFiscalTree = (records: NbsRecord[], children: Record<string, NbsRecord[]>, expanded: Set<string>, candidateId: string | undefined, activate: (record: NbsRecord) => void, depth = 0): React.ReactNode => records.map((record) => <div key={record.id} style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
    <Button id={`fiscal-node-${record.id}`} fullWidth variant={candidateId === record.id ? "light" : "subtle"} color={candidateId === record.id ? "light.1" : "dark"} justify="flex-start" leftSection={<FeatherIcon icon={expanded.has(record.id) ? "chevron-down" : "chevron-right"} size={15} />} style={{ minHeight: 40, height: "auto", width: "100%", maxWidth: "100%", borderRadius: 0, paddingLeft: 10 + depth * 20 }} styles={{ inner: { width: "100%", maxWidth: "100%", alignItems: "flex-start" }, section: { alignSelf: "flex-start", marginTop: 2 }, label: { width: "100%", maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "left", lineHeight: 1.35 } }} onClick={() => activate(record)}>
      <span style={{ display: "grid", gridTemplateColumns: "minmax(72px, 108px) minmax(0, 1fr)", gap: 12, width: "100%", alignItems: "start" }}>
        <span style={{ justifySelf: "start", fontFamily: "monospace", fontWeight: 700 }}>{record.code}</span>
        <span style={{ minWidth: 0 }}>{record.description}</span>
      </span>
    </Button>
    {expanded.has(record.id) && renderFiscalTree(children[record.id] || [], children, expanded, candidateId, activate, depth + 1)}
  </div>);
  return <Stack gap="md" style={{ width: "100%", height: "calc(100vh - 60px)", minHeight: 0 }}>
    <Title order={2}>{t("stock.title")}</Title>
    <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
      <Group justify="space-between">
        <SegmentedControl color="light.1" value={mode} disabled={importedProducts.length > 0} onChange={(value) => { setMode(value as Mode); setNarrowFormOpen(false); setImportedProducts([]); setSelectedImportKey(null); }} data={[{ value: "products", label: t("storefront.products") }, { value: "services", label: t("storefront.services") }]} />
        <Group>{importedProducts.length > 0 && <Button variant="subtle" color="red" onClick={cancelImport}>{t("stock.cancelImport")}</Button>}{mode === "products" && <FileButton resetRef={resetFile} onChange={importNfe} accept="text/xml,application/xml,.xml">{(props) => <Button {...props} variant="light" color="light.1" loading={importLoading} disabled={importLoading} leftSection={<FeatherIcon icon="upload" size={16} />}>{t("stock.importNfe")}</Button>}</FileButton>}<Button variant="subtle" color="light.1" disabled={importedProducts.length > 0} leftSection={<FeatherIcon icon="plus" size={16} />} onClick={() => { mode === "products" ? setProduct(blankProduct(customerId)) : setService(blankService(customerId)); setNarrowFormOpen(true); }}>{t("stock.new")}</Button></Group>
      </Group>
      {loading ? <Group justify="center" style={{ flex: 1 }}><Loader color="light.1" /></Group> : <SimpleGrid cols={importedProducts.length > 0 && !importEditorOpen ? 1 : { base: 1, md: 2 }} spacing="md" style={{ flex: 1, minHeight: 0, height: "100%", overflow: "hidden", gridAutoRows: "minmax(0, 1fr)", alignContent: "stretch" }}>
        {(!isNarrow || !narrowFormOpen) && <Stack gap="xs" style={{ minHeight: 280, height: "100%" }}><Paper withBorder radius="sm" style={{ overflow: "hidden", minHeight: 0, flex: 1 }}>{importLoading ? <Group justify="center" h="100%"><Loader color="light.1" /></Group> : <ScrollArea h="100%"><Table highlightOnHover><Table.Thead><Table.Tr><Table.Th>{t("common.fields.name")}</Table.Th><Table.Th>{mode === "products" ? t("common.fields.stock") : t("common.fields.expectedTime")}</Table.Th><Table.Th w={48} /></Table.Tr></Table.Thead><Table.Tbody>{importedProducts.length ? importedProducts.map((item) => <Table.Tr key={item.key} onClick={() => { setSelectedImportKey(item.key); setProduct(item.draft); setImportEditorOpen(true); setNarrowFormOpen(true); }} style={{ cursor: "pointer", background: item.key === selectedImportKey ? "#f0effa" : undefined }}><Table.Td><Group gap="xs" wrap="wrap"><Text fw={700}>{item.draft.name || item.sourceCode || item.key}</Text><Badge size="xs" variant="light" color={item.inventoryAction === "REPLENISHMENT" ? "blue" : "green"}>{item.inventoryAction === "REPLENISHMENT" ? t("stock.replenishment") : t("stock.insertion")}</Badge><Badge size="xs" variant="light" color={item.approved ? "green" : "yellow"}>{item.approved ? t("stock.approved") : t("stock.pendingApproval")}</Badge>{importedUnitCostDiffers(item) && <Badge size="xs" variant="light" color="orange">{t("stock.unitCostDiffers")}</Badge>}</Group><Text size="xs" c={item.draft.barcodeGTIN ? "dimmed" : "red"}>{item.draft.barcodeGTIN || t("stock.missingGtin")}</Text>{importedUnitCostDiffers(item) && <Text size="xs" c="orange.8">{t("stock.unitCostComparison", { incoming: formatUnitCost(item.draft.acquisitionPrice), mean: formatUnitCost(item.currentMeanUnitCost) })}</Text>}</Table.Td><Table.Td>+{item.quantity}</Table.Td><Table.Td><Group gap={4} wrap="nowrap">{item.approved && <ActionIcon variant="subtle" color="yellow" aria-label={t("stock.revokeApproval")} onClick={(event) => { event.stopPropagation(); revokeImportApproval(item.key); }}><FeatherIcon icon="rotate-ccw" size={15} /></ActionIcon>}<ActionIcon variant="subtle" color="red" aria-label={t("stock.removeImportItem")} onClick={(event) => { event.stopPropagation(); setRemoveImportTarget(item); }}><FeatherIcon icon="trash-2" size={15} /></ActionIcon></Group></Table.Td></Table.Tr>) : (mode === "products" ? products : services).map((item) => <Table.Tr key={item.id} onClick={() => { mode === "products" ? setProduct(normalizeProductPricing(item as Product)) : setService(item as Service); setNarrowFormOpen(true); }} style={{ cursor: "pointer" }}><Table.Td><Text fw={700}>{item.name || item.id}</Text>{mode === "products" && <Text size="xs" c="dimmed">{(item as Product).barcodeGTIN || "-"}</Text>}</Table.Td><Table.Td>{mode === "products" ? (item as Product).stock ?? 0 : `${(item as Service).expectedTime ?? 0} min`}</Table.Td><Table.Td><ActionIcon variant="subtle" color="light.1"><FeatherIcon icon="edit-2" size={15} /></ActionIcon></Table.Td></Table.Tr>)}</Table.Tbody></Table></ScrollArea>}</Paper>{importedProducts.length > 0 && <Group justify="flex-end" wrap="nowrap"><Button variant="light" color="light.1" leftSection={<FeatherIcon icon="play" size={16} />} onClick={processImportList}>{t("stock.processImportList")}</Button><Button color="light.1" loading={saving} disabled={!importedProducts.some((item) => item.approved)} leftSection={<FeatherIcon icon="check" size={16} />} onClick={() => void applyImportList()}>{t("stock.applyImport")}</Button></Group>}</Stack>}
        {(!isNarrow || narrowFormOpen) && (!importedProducts.length || importEditorOpen) && <Paper withBorder radius="sm" p="md" style={{ minHeight: 0, height: "100%", overflow: "hidden" }}><ScrollArea h="100%"><Stack gap="sm">
          <Group justify="flex-start" align="center" gap="xs">
            {isNarrow && <Button variant="subtle" color="light.1" leftSection={<FeatherIcon icon="arrow-left" size={16} />} onClick={() => { setNarrowFormOpen(false); if (importedProducts.length) setImportEditorOpen(false); }}>{t("common.actions.back")}</Button>}
            <Title order={3}>{mode === "products" ? (selectedImport ? t("stock.reviewImportProduct") : product.id ? t("stock.editProduct") : t("stock.newProduct")) : (service.id ? t("stock.editService") : t("stock.newService"))}</Title>
          </Group>
          {mode === "products" ? <>
            <TextInput label={t("common.fields.name")} error={productErrors.name} value={product.name || ""} onChange={(e) => setProduct({ ...product, name: e.currentTarget.value })} required />
            <TextInput label="GTIN" error={productErrors.gtin} value={product.barcodeGTIN || ""} onChange={(e) => setProduct({ ...product, barcodeGTIN: e.currentTarget.value.replace(/\D/g, "") })} />
            {selectedImport && <NumberInput label={t("stock.importQuantity")} value={selectedImport.quantity} error={productErrors.quantity} readOnly />}
            <Textarea label={t("common.fields.description")} value={product.description || ""} onChange={(e) => setProduct({ ...product, description: e.currentTarget.value })} />
            <SimpleGrid cols={2}><TextInput label={t("stock.category")} error={productErrors.category} value={selectedCategory?.name || ""} placeholder={t("stock.selectCategory")} readOnly required onClick={openCategoryModal} rightSection={<FeatherIcon icon="chevron-right" size={16} />} styles={{ input: { cursor: "pointer" } }} /><Select label={t("stock.unit")} error={productErrors.unit} data={options(units)} value={product.unitId} onChange={(value) => setProduct({ ...product, unitId: value || "" })} required searchable /></SimpleGrid>
            <Select label={t("stock.destination")} error={productErrors.destination} value={product.destination || null} onChange={(value) => setProduct({ ...product, destination: (value || "") as ProductDestination | "" })} data={[{ value: "resale", label: t("stock.destination.resale") }, { value: "consumption_services", label: t("stock.destination.consumptionServices") }, { value: "consumption_daily", label: t("stock.destination.consumptionDaily") }]} required />
            <SimpleGrid cols={2}><TextInput label="NCM" error={productErrors.ncm} value={product.fiscalNCMId ? `${ncmById[product.fiscalNCMId]?.code || product.NCM || ""} - ${ncmById[product.fiscalNCMId]?.description || ""}` : ""} placeholder={t("stock.selectNcm")} readOnly required onClick={openNcmModal} rightSection={<FeatherIcon icon="chevron-right" size={16} />} styles={{ input: { cursor: "pointer" } }} /><NumberInput label={t(selectedImport ? "stock.currentStock" : "common.fields.stock")} value={product.stock ?? 0} onChange={(value) => setProduct({ ...product, stock: Number(value) || 0 })} step={1} readOnly={Boolean(selectedImport)} /></SimpleGrid>
            <SimpleGrid cols={3}><NumberInput label={t("stock.acquisitionPrice")} decimalScale={2} value={product.acquisitionPrice === null ? "" : product.acquisitionPrice} onChange={(value) => setProduct((current) => ({ ...current, acquisitionPrice: value, salePrice: salePriceFromMargin(selectedImport ? projectedMeanUnitCost(selectedImport.currentMeanUnitCost, current.stock, selectedImport.quantity, value) : value, current.profitMargin) }))} />{selectedImport ? <NumberInput label={t("stock.currentMeanUnitCost")} decimalScale={2} value={pricingUnitCost ?? ""} readOnly /> : <NumberInput label={t("common.fields.minimumStock")} value={product.minimumStock ?? 0} onChange={(value) => setProduct({ ...product, minimumStock: Number(value) || 0 })} />}<NumberInput label={t("common.fields.profitMargin")} decimalScale={2} min={0} suffix="%" value={product.profitMargin === null ? "" : product.profitMargin} onChange={(value) => setProduct((current) => ({ ...current, profitMargin: value, salePrice: salePriceFromMargin(pricingUnitCost, value) }))} /></SimpleGrid>
            <SimpleGrid cols={3}><NumberInput label={t("stock.salePrice")} decimalScale={2} value={salePriceFromMargin(pricingUnitCost, product.profitMargin) ?? ""} readOnly /><TextInput label={t("stock.taxes")} value={t("stock.taxesAtSale")} readOnly /><NumberInput label={t("stock.profit")} decimalScale={2} value={(Number(salePriceFromMargin(pricingUnitCost, product.profitMargin)) || 0) - (Number(pricingUnitCost) || 0)} readOnly /></SimpleGrid>
            <Group justify="flex-end"><Button color="light.1" loading={saving} onClick={() => void saveProduct()}>{selectedImport ? t("stock.approveProduct") : t("common.actions.save")}</Button></Group>
          </> : <>
            <TextInput label={t("common.fields.name")} value={service.name || ""} onChange={(e) => setService({ ...service, name: e.currentTarget.value })} required />
            <Textarea label={t("common.fields.description")} value={service.description || ""} onChange={(e) => setService({ ...service, description: e.currentTarget.value })} />
            <SimpleGrid cols={2}><TextInput label={t("stock.category")} value={selectedCategory?.name || ""} placeholder={t("stock.selectCategory")} readOnly required onClick={openCategoryModal} rightSection={<FeatherIcon icon="chevron-right" size={16} />} styles={{ input: { cursor: "pointer" } }} /><TextInput label={t("stock.serviceCode")} value={service.code || ""} onChange={(e) => setService({ ...service, code: e.currentTarget.value })} required /></SimpleGrid>
            <TextInput label="NBS" value={service.fiscalNBSId ? `${nbsById[service.fiscalNBSId]?.code || ""} - ${nbsById[service.fiscalNBSId]?.description || service.fiscalNBSId}` : ""} placeholder={t("stock.selectNbs")} readOnly required onClick={openNbsModal} rightSection={<FeatherIcon icon="chevron-right" size={16} />} styles={{ input: { cursor: "pointer" } }} />
            <NumberInput label={t("common.fields.expectedTime")} value={service.expectedTime ?? ""} onChange={(value) => setService({ ...service, expectedTime: Number(value) || null })} />
            <SimpleGrid cols={2}><NumberInput label={t("stock.basicCost")} decimalScale={2} value={service.basicCost === null ? "" : service.basicCost} onChange={(value) => setService({ ...service, basicCost: value })} /><NumberInput label={t("stock.salePrice")} decimalScale={2} value={service.basicFee === null ? "" : service.basicFee} onChange={(value) => setService({ ...service, basicFee: value })} /></SimpleGrid>
            <Group justify="flex-end"><Button color="light.1" loading={saving} onClick={() => void saveService()}>{t("common.actions.save")}</Button></Group>
          </>}
        </Stack></ScrollArea></Paper>}
      </SimpleGrid>}
    </Stack>
    <Modal opened={Boolean(duplicateNfePending)} onClose={() => setDuplicateNfePending(null)} title={t("stock.duplicateNfeTitle")} size="lg" centered zIndex={1800}>
      <Stack gap="md"><Text c="dimmed">{t("stock.duplicateNfeMessage")}</Text><Paper withBorder radius="sm" p="sm" bg="yellow.0"><Text fw={700} ff="monospace" style={{ overflowWrap: "anywhere" }}>{duplicateNfePending?.accessKey}</Text>{duplicateNfePending?.previousImport && <Text size="xs" c="dimmed">{t("stock.duplicateNfeCount", { count: String(duplicateNfePending.previousImport.importCount) })}</Text>}</Paper><Group justify="flex-end"><Button variant="subtle" color="light.1" onClick={() => setDuplicateNfePending(null)}>{t("common.actions.cancel")}</Button><Button color="yellow" onClick={() => { if (duplicateNfePending) stagePreprocessedNfe(duplicateNfePending); }}>{t("stock.continueDuplicateNfe")}</Button></Group></Stack>
    </Modal>
    <Modal opened={Boolean(removeImportTarget)} onClose={() => setRemoveImportTarget(null)} title={t("stock.removeImportConfirmTitle")} centered zIndex={1700}>
      <Stack gap="md">
        <Text c="dimmed">{t("stock.removeImportConfirmMessage")}</Text>
        <Paper withBorder radius="sm" p="sm" bg="gray.0"><Text fw={700}>{removeImportTarget?.draft.name || removeImportTarget?.sourceCode || "-"}</Text>{removeImportTarget?.draft.barcodeGTIN && <Text size="xs" c="dimmed">GTIN {removeImportTarget.draft.barcodeGTIN}</Text>}</Paper>
        <Group justify="flex-end"><Button variant="subtle" color="light.1" onClick={() => setRemoveImportTarget(null)}>{t("common.actions.cancel")}</Button><Button color="red" onClick={() => { if (removeImportTarget) removeImportItem(removeImportTarget.key); setRemoveImportTarget(null); }}>{t("stock.removeImportItem")}</Button></Group>
      </Stack>
    </Modal>
    <Modal opened={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title={<Group justify="space-between" wrap="nowrap" w="calc(100% - 8px)"><Text fw={700}>{t("stock.selectCategory")}</Text><TextInput value={categorySearch} onChange={(event) => { const value = event.currentTarget.value; setCategorySearch(value); setCategoryCandidate(null); if (value.trim()) { const query = value.trim().toLocaleLowerCase(); const expanded = new Set<string>(); activeCategories.forEach((item) => { if (!(item.name || item.abbreviation || item.id).toLocaleLowerCase().includes(query)) return; let current = item.parentId ? categoryById.get(item.parentId) : undefined; while (current) { expanded.add(current.id); current = current.parentId ? categoryById.get(current.parentId) : undefined; } }); setCategoryExpanded(expanded); } }} placeholder={t("stock.searchFiscal")} leftSection={<FeatherIcon icon="search" size={15} />} w={280} /></Group>} size="lg" centered zIndex={1600}>
      <Stack gap="sm">
        <Paper withBorder radius="sm" style={{ height: 420, overflow: "hidden" }}>
          <ScrollArea h="100%">
            {(categoryChildren.__root__ || []).length ? renderCategoryTree(categoryChildren.__root__ || []) : <Text c="dimmed" ta="center" py="xl">{t("stock.noCategories")}</Text>}
          </ScrollArea>
        </Paper>
        <Group justify="space-between">
          <Button variant="subtle" color="light.1" onClick={() => setCategoryModalOpen(false)}>{t("common.actions.back")}</Button>
          <Button color="light.1" disabled={!categoryCandidate} onClick={confirmCategory}>{t("common.actions.select")}</Button>
        </Group>
      </Stack>
    </Modal>
    <Modal opened={ncmModalOpen} onClose={() => setNcmModalOpen(false)} title={<Group justify="space-between" wrap="nowrap" w="calc(100% - 8px)"><Text fw={700}>{t("stock.selectNcm")}</Text><TextInput value={ncmSearch} onChange={(event) => { setNcmShowingSelection(false); setNcmCandidate(null); setNcmLoading(true); setNcmSearch(event.currentTarget.value); }} placeholder={t("stock.searchFiscal")} leftSection={<FeatherIcon icon="search" size={15} />} w={280} /></Group>} size="lg" centered zIndex={1600}>
      <Stack gap="sm"><Paper withBorder radius="sm" style={{ height: 420, overflow: "hidden" }}>{ncmLoading ? <Group justify="center" h="100%"><Loader color="light.1" /></Group> : <ScrollArea h="100%">{renderFiscalTree(ncmItems, ncmChildren, ncmExpanded, ncmCandidate?.id, (record) => void activateNcm(record))}</ScrollArea>}</Paper>
        <Group justify="space-between"><Button variant="subtle" color="light.1" onClick={() => setNcmModalOpen(false)}>{t("common.actions.back")}</Button><Button color="light.1" disabled={ncmLoading || !ncmCandidate} onClick={confirmNcm}>{t("common.actions.select")}</Button></Group>
      </Stack>
    </Modal>
    <Modal opened={nbsModalOpen} onClose={() => setNbsModalOpen(false)} title={<Group justify="space-between" wrap="nowrap" w="calc(100% - 8px)"><Text fw={700}>{t("stock.selectNbs")}</Text><TextInput value={nbsSearch} onChange={(event) => { setNbsShowingSelection(false); setNbsCandidate(null); setNbsLoading(true); setNbsSearch(event.currentTarget.value); }} placeholder={t("stock.searchFiscal")} leftSection={<FeatherIcon icon="search" size={15} />} w={280} /></Group>} size="lg" centered zIndex={1600}>
      <Stack gap="sm"><Paper withBorder radius="sm" style={{ height: 420, overflow: "hidden" }}>{nbsLoading ? <Group justify="center" h="100%"><Loader color="light.1" /></Group> : <ScrollArea h="100%">{renderFiscalTree(nbsItems, nbsChildren, nbsExpanded, nbsCandidate?.id, (record) => void activateNbs(record))}</ScrollArea>}</Paper>
        <Group justify="space-between"><Button variant="subtle" color="light.1" onClick={() => setNbsModalOpen(false)}>{t("common.actions.back")}</Button><Button color="light.1" disabled={nbsLoading || !nbsCandidate} onClick={confirmNbs}>{t("common.actions.select")}</Button></Group>
      </Stack>
    </Modal>
  </Stack>;
}
