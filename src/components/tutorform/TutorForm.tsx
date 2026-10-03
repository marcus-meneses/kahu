import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { UIEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Button,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
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
import { ActivityModal as Modal, SecondaryModal, useActivityDiscardGuard } from "../activity/ActivityModal";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { useModuleState } from "../../classes/contexts/ModuleStateContext";
import { useDetailTransition } from "../../classes/contexts/DetailTransitionContext";
import { useExternalDialog } from "../../classes/contexts/ExternalDialogContext";
import { NavigationFrame, useNavigationStack } from "../../classes/contexts/NavigationStackContext";
import ApiBroker from "../../primitives/ApiBroker";
import { decodeAccessToken } from "../../classes/utils/auth";
import { useI18n } from "../../i18n/I18nContext";
import { shouldShowRequestError } from "../../classes/utils/requestErrors";
import type { TranslationKey } from "../../i18n/dictionaries";

type TutorRecord = {
  id: string;
  numericId?: string | number;
  name?: string | null;
  cpf?: string | null;
  identity?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  address?: string | null;
  postalCode?: string | null;
  cityId: string;
  customerId: string;
  animals?: AnimalRecord[];
};

type AnimalSize = "MINI" | "SMALL" | "MEDIUM" | "LARGE" | "GIANT";

type AnimalRecord = {
  id: string;
  primaryTutorId?: string | null;
  customerId?: string | null;
  name?: string | null;
  speciesId?: string | null;
  speciesText?: string | null;
  breedId?: string | null;
  breedText?: string | null;
  color?: string | null;
  weightKg?: string | number | null;
  size?: AnimalSize | null;
  description?: string | null;
  humanFamily?: string | null;
  petFamily?: string | null;
  picture?: string | null;
};

type CustomerRecord = {
  id: string;
  name?: string | null;
  fiscalName?: string | null;
  email?: string | null;
  cityId?: string | null;
};

type CountryRecord = {
  id: string;
  name?: string | null;
  namePTBR?: string | null;
  abbreviation?: string | null;
  bacenCode?: string | number | null;
};

type CityRecord = {
  id: string;
  name?: string | null;
  stateId?: string | null;
};

type StateRecord = {
  id: string;
  name?: string | null;
  abbreviation?: string | null;
  countryId?: string | null;
  callCodes?: string | null;
};

type CityPickerLevel = "countries" | "states" | "cities";

type TutorListState = {
  pageIndex: number;
  pageSize: number;
  search: string;
  appliedSearch: string;
};

type TutorDraft = {
  id?: string;
  name: string;
  cpf: string;
  identity: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  postalCode: string;
  cityId: string;
  customerId: string;
};

type TutorDraftErrors = Partial<Record<keyof TutorDraft, string>>;
type TutorFieldTranslationKey = Extract<
  TranslationKey,
  | "common.fields.name"
  | "common.fields.cpf"
  | "common.fields.phone"
  | "common.fields.phone2"
  | "common.fields.address"
  | "common.fields.postalCode"
  | "common.fields.city"
  | "common.fields.email"
>;

const defaultTutorListState: TutorListState = {
  pageIndex: 1,
  pageSize: 10,
  search: "",
  appliedSearch: "",
};

const emptyDraft: TutorDraft = {
  name: "",
  cpf: "",
  identity: "",
  email: "",
  phone: "",
  phone2: "",
  address: "",
  postalCode: "",
  cityId: "",
  customerId: "",
};

const pageSizeOptions = [10, 25, 50];
const cityPickerPageSize = 30;
const tutorDetailsPageHeight = 500;
const valueOrEmpty = (value?: string | null) => value ?? "";
const nullable = (value: string) => value.trim() || null;

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  const suffix = digits.slice(9, 11);

  return suffix ? `${parts.join(".")}-${suffix}` : parts.join(".");
};

const formatMaskedCpfForTable = (value?: string | null) => {
  const digits = onlyDigits(valueOrEmpty(value));
  if (digits.length < 9) return "";

  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-*`;
};

const isValidCpf = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
};

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  const area = digits.slice(0, 2);

  if (digits.length <= 2) return area ? `(${area}` : "";

  const localNumber = digits.slice(2);
  const firstBlockLength = localNumber.length > 8 ? 5 : 4;
  const firstBlock = localNumber.slice(0, firstBlockLength);
  const secondBlock = localNumber.slice(firstBlockLength, firstBlockLength + 4);

  if (!secondBlock) return `(${area})${firstBlock}`;
  return `(${area})${firstBlock}-${secondBlock}`;
};

const isValidPhone = (value: string) => {
  const length = onlyDigits(value).length;
  return length === 10 || length === 11;
};

const normalizeBrazilianMobilePhone = (value?: string | null) => {
  const digits = onlyDigits(valueOrEmpty(value));
  const nationalDigits = digits.length === 13 && digits.startsWith("55") ? digits.slice(2) : digits;

  if (nationalDigits.length !== 11 || nationalDigits[2] !== "9") return null;

  return nationalDigits;
};

const whatsappUrlForPhone = (value?: string | null) => {
  const nationalDigits = normalizeBrazilianMobilePhone(value);

  return nationalDigits ? `https://wa.me/55${nationalDigits}` : null;
};

const mapsIconUrl = "https://cdn-icons-png.flaticon.com/512/1865/1865269.png";

const googleMapsUrlForAddress = (address?: string | null, city?: CityRecord, postalCode?: string | null) => {
  const parts = [address?.trim(), city?.name?.trim(), postalCode ? formatPostalCode(postalCode) : ""].filter(Boolean);

  return parts.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}` : null;
};

function WhatsAppLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
      />
    </svg>
  );
}

const formatPostalCode = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

const isValidPostalCode = (value: string) => onlyDigits(value).length === 8;

const isValidEmail = (value: string) =>
  !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const firstNameToken = (value?: string | null) => value?.trim().split(/\s+/)[0] ?? "";

const displaySpeciesBreed = (speciesText?: string | null, breedText?: string | null) =>
  [speciesText, breedText].map(valueOrEmpty).filter(Boolean).join(" - ");

const displayCountry = (country?: CountryRecord) =>
  country ? country.namePTBR || country.name || country.abbreviation || country.id : "";

const displayState = (state?: StateRecord) =>
  state ? [state.name, state.abbreviation].filter(Boolean).join("-") || state.id : "";

const displayCity = (city?: CityRecord, stateById?: Map<string, StateRecord>) => {
  if (!city) return "";

  const stateAbbreviation = city.stateId ? stateById?.get(city.stateId)?.abbreviation : "";

  return [city.name, stateAbbreviation].filter(Boolean).join("-");
};

const sortByLabel = <T,>(items: T[], label: (item: T) => string) =>
  [...items].sort((left, right) => label(left).localeCompare(label(right)));

const mergeUnique = <T extends { id: string }>(current: T[], incoming: T[]) => {
  const additions = incoming.filter((item) => !current.some((known) => known.id === item.id));
  return additions.length ? [...current, ...additions] : current;
};

const resourceIdFromState = (state: unknown, keys: string[]) => {
  if (!state || typeof state !== "object") return "";

  const record = state as Record<string, unknown>;
  const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === "string" && candidate.trim());

  return typeof value === "string" ? value.trim() : "";
};

const toDraft = (tutor: TutorRecord): TutorDraft => ({
  id: tutor.id,
  name: valueOrEmpty(tutor.name),
  cpf: formatCpf(valueOrEmpty(tutor.cpf)),
  identity: valueOrEmpty(tutor.identity),
  email: valueOrEmpty(tutor.email),
  phone: formatPhone(valueOrEmpty(tutor.phone)),
  phone2: formatPhone(valueOrEmpty(tutor.phone2)),
  address: valueOrEmpty(tutor.address),
  postalCode: formatPostalCode(valueOrEmpty(tutor.postalCode)),
  cityId: tutor.cityId,
  customerId: tutor.customerId,
});

export default function TutorForm({ activityFrame, activityLayer = 1000 }: { activityFrame?: NavigationFrame; activityLayer?: number } = {}) {
  const userContext = useContext(UserContext) as UserContextInterface;
  const broker = useMemo(() => new ApiBroker(userContext.config.apiData), [userContext.config.apiData]);
  const location = useLocation();
  const navigate = useNavigate();
  const loggedIdentity = decodeAccessToken(userContext.config.apiData.apiAuthHeaderValue);
  const isSuperuser = loggedIdentity?.clearance === "SUP";
  const { t } = useI18n();
  const { completeDetailTransition } = useDetailTransition();
  const { open: openLookup } = useExternalDialog();
  const { closeActivity, closeActivityFrame, endLocalActivity, frames, openActivity } = useNavigationStack();
  const activityIndex = activityFrame ? frames.filter((frame) => frame.activity).findIndex((frame) => frame.id === activityFrame.id) : 0;
  const detailCloseLabel = t(activityIndex > 0 ? "common.actions.back" : "common.actions.cancel");
  const activityOnly = Boolean(activityFrame?.activity);
  const requestDiscard = useActivityDiscardGuard();

  const [tutors, setTutors] = useState<TutorRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [states, setStates] = useState<StateRecord[]>([]);
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [listState, setListState] = useModuleState<TutorListState>("tutors.list", defaultTutorListState);
  const { pageIndex, pageSize, search, appliedSearch } = listState;
  const setPageIndex = (pageIndex: number) => setListState((current) => ({ ...current, pageIndex }));
  const setPageSize = (pageSize: number) => setListState((current) => ({ ...current, pageSize }));
  const setSearch = (search: string) => setListState((current) => ({ ...current, search }));
  const setAppliedSearch = (appliedSearch: string) => setListState((current) => ({ ...current, appliedSearch }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TutorRecord | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<TutorRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityPickerLevel, setCityPickerLevel] = useState<CityPickerLevel>("countries");
  const [cityPickerCountryId, setCityPickerCountryId] = useState<string | null>(null);
  const [cityPickerStateId, setCityPickerStateId] = useState<string | null>(null);
  const [countryOptions, setCountryOptions] = useState<CountryRecord[]>([]);
  const [stateOptions, setStateOptions] = useState<StateRecord[]>([]);
  const [cityOptions, setCityOptions] = useState<CityRecord[]>([]);
  const [countryOffset, setCountryOffset] = useState(0);
  const [stateOffset, setStateOffset] = useState(0);
  const [cityOffset, setCityOffset] = useState(0);
  const [countryHasMore, setCountryHasMore] = useState(false);
  const [stateHasMore, setStateHasMore] = useState(false);
  const [cityHasMore, setCityHasMore] = useState(false);
  const [cityPickerLoading, setCityPickerLoading] = useState(false);
  const [draft, setDraft] = useState<TutorDraft>(emptyDraft);
  const [draftErrors, setDraftErrors] = useState<TutorDraftErrors>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof TutorDraft, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusedField, setFocusedField] = useState<keyof TutorDraft | null>(null);
  const handledDetailsRouteRef = useRef<string | null>(null);
  const editActivityIdRef = useRef<string | null>(null);
  const handledActivityFrameRef = useRef<string | null>(null);
  const cityContextRequestsRef = useRef(new Map<string, Promise<void>>());

  const completeRouteTransition = useCallback((transitionId: string) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => completeDetailTransition(transitionId));
    });
  }, [completeDetailTransition]);

  const customerById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );
  const cityById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);
  const stateById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states]);
  const countryById = useMemo(() => new Map(countries.map((country) => [country.id, country])), [countries]);
  const selectedCityLabel = displayCity(cityById.get(draft.cityId), stateById);

  const defaultTutorRelations = useMemo(() => {
    const sourceCustomerId =
      isSuperuser && userContext.impersonatedUser
        ? userContext.impersonatedUser.customerId
        : loggedIdentity?.customerId ?? "";
    const sourceCityId =
      isSuperuser && userContext.impersonatedUser?.cityId
        ? userContext.impersonatedUser.cityId
        : customerById.get(sourceCustomerId)?.cityId ?? "";

    return {
      customerId: sourceCustomerId,
      cityId: sourceCityId ?? "",
    };
  }, [customerById, isSuperuser, loggedIdentity?.customerId, userContext.impersonatedUser]);

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

  const loadTutors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await broker.getData({
        route: "/api/tutors",
        method: "GET",
        query: {
          pageSize,
          pageIndex: pageIndex - 1,
          orders: [{ f: "name", d: "ASC" }],
          filters: appliedSearch ? [{ f: "name", o: "HAS", v: appliedSearch }] : [],
          options: { fetchAnimals: true },
        },
      });
      setTutors(response.data as TutorRecord[]);
      setTotalRows(response.pagination.totalRecords);
    } catch (error) {
      notifyError(t("tutors.errors.load"), error);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, broker, notifyError, pageIndex, pageSize, t]);

  useEffect(() => {
    if (!activityOnly) void loadTutors();
  }, [activityOnly, loadTutors]);

  const closeDetails = useCallback(() => {
    setDetailsTarget(null);
    if (activityFrame) {
      closeActivityFrame(activityFrame.id);
      return;
    }
    if (location.pathname === "/home/tutors/details" || location.pathname === "/home/tutor/details") {
      closeActivity("/home/tutors");
    }
  }, [activityFrame, closeActivity, closeActivityFrame, location.pathname]);

  const renderPhoneDetail = (label: string, value?: string | null) => {
    const whatsappUrl = whatsappUrlForPhone(value);

    return (
      <Paper withBorder radius="sm" p="sm" style={{ position: "relative", paddingRight: whatsappUrl ? "var(--kahu-inline-action)" : undefined, minHeight: "var(--kahu-inline-action)" }}>
        <Text size="xs" c="dimmed" tt="uppercase">{label}</Text>
        <Text fw={700}>{value ? formatPhone(value) : "-"}</Text>
        {whatsappUrl && (
          <Tooltip label={t("tutors.contactWhatsapp")} position="top" zIndex={1600} withinPortal>
            <ActionIcon
              component="a"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="green"
              aria-label={t("tutors.contactWhatsapp")}
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "var(--kahu-inline-action)",
                height: "100%",
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: "1px solid #d7d4e8",
              }}
            >
              <WhatsAppLogo size={48} />
            </ActionIcon>
          </Tooltip>
        )}
      </Paper>
    );
  };

  const renderAddressDetail = (tutor: TutorRecord) => {
    const city = cityById.get(tutor.cityId);
    const mapsUrl = googleMapsUrlForAddress(tutor.address, city, tutor.postalCode);

    return (
      <Paper withBorder radius="sm" p="sm" style={{ position: "relative", paddingRight: mapsUrl ? "var(--kahu-inline-action)" : undefined, minHeight: "var(--kahu-inline-action)" }}>
        <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.address")}</Text>
        <Text fw={700}>{tutor.address || "-"}</Text>
        {mapsUrl && (
          <Tooltip label={t("tutors.openMaps")} position="top" zIndex={1600} withinPortal>
            <ActionIcon
              component="a"
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="light.1"
              aria-label={t("tutors.openMaps")}
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "var(--kahu-inline-action)",
                height: "100%",
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: "1px solid #d7d4e8",
              }}
            >
              <img src={mapsIconUrl} alt="" aria-hidden style={{ width: "var(--kahu-inline-icon)", height: "var(--kahu-inline-icon)", objectFit: "contain" }} />
            </ActionIcon>
          </Tooltip>
        )}
      </Paper>
    );
  };

  useEffect(() => {
    if (activityOnly) return;
    const isDetailsRoute = location.pathname === "/home/tutors/details" || location.pathname === "/home/tutor/details";

    if (!isDetailsRoute) {
      handledDetailsRouteRef.current = null;
      return;
    }

    const tutorId = resourceIdFromState(location.state, ["tutorId", "resourceId", "id"]);
    const transitionId = resourceIdFromState(location.state, ["transitionId"]);
    if (!tutorId) {
      if (transitionId) completeDetailTransition(transitionId);
      navigate("/home/tutors", { replace: true });
      return;
    }

    const routeKey = `${location.key}:${tutorId}`;
    if (handledDetailsRouteRef.current === routeKey) return;
    handledDetailsRouteRef.current = routeKey;
    openActivity({ type: "tutor.details", resourceId: tutorId });
    navigate("/home/tutors", { replace: true, state: null });
    return;
  }, [activityOnly, broker, completeDetailTransition, completeRouteTransition, location.key, location.pathname, location.state, navigate, notifyError, openActivity, t, tutors]);

  const loadCityContext = useCallback((cityId: string): Promise<void> => {
    if (!cityId) return Promise.resolve();

    const pendingRequest = cityContextRequestsRef.current.get(cityId);
    if (pendingRequest) return pendingRequest;

    const request = (async () => {
      try {
        const city = cityById.get(cityId) ??
          (await broker.getDataPlain({ route: "/api/cities/" + cityId, method: "GET" }) as { data?: CityRecord }).data;
        if (!city) return;

        setCities((current) => mergeUnique(current, [city]));
        if (!city.stateId || stateById.has(city.stateId)) return;

        const state =
          (await broker.getDataPlain({ route: "/api/states/" + city.stateId, method: "GET" }) as { data?: StateRecord }).data;
        if (state) setStates((current) => mergeUnique(current, [state]));
      } catch (error) {
        notifyError(t("tutors.errors.loadLookups"), error);
      }
    })().finally(() => {
      cityContextRequestsRef.current.delete(cityId);
    });

    cityContextRequestsRef.current.set(cityId, request);
    return request;
  }, [broker, cityById, notifyError, stateById, t]);

  useEffect(() => {
    if (!modalOpen || !draft.cityId) return;
    void loadCityContext(draft.cityId);
  }, [draft.cityId, loadCityContext, modalOpen]);

  useEffect(() => {
    if (!detailsTarget?.cityId) return;
    void loadCityContext(detailsTarget.cityId);
  }, [detailsTarget?.cityId, loadCityContext]);

  const listCountriesPage = async (offset: number, search = citySearch) => {
    const response = await broker.getData({
      route: "/api/countries",
      method: "GET",
      query: {
        pageSize: cityPickerPageSize,
        pageIndex: offset / cityPickerPageSize,
        orders: [],
        filters: search ? [{ f: "name", o: "HAS", v: search }] : [],
      },
    });
    return response.data as CountryRecord[];
  };

  const listStatesPage = async (countryId: string, offset: number, search = citySearch) => {
    const response = await broker.getData({
      route: `/api/states/by-country/${countryId}`,
      method: "GET",
      query: {
        pageSize: cityPickerPageSize,
        pageIndex: offset / cityPickerPageSize,
        orders: [],
        filters: search ? [{ f: "name", o: "HAS", v: search }] : [],
      },
    });
    return response.data as StateRecord[];
  };

  const listCitiesPage = async (stateId: string, offset: number, search = citySearch) => {
    const response = await broker.getData({
      route: `/api/cities/by-state/${stateId}`,
      method: "GET",
      query: {
        pageSize: cityPickerPageSize,
        pageIndex: offset / cityPickerPageSize,
        orders: [],
        filters: search ? [{ f: "name", o: "HAS", v: search }] : [],
      },
    });
    return response.data as CityRecord[];
  };

  const loadCountryOptions = async (reset = true, search = citySearch) => {
    const offset = reset ? 0 : countryOffset;
    setCityPickerLoading(true);
    try {
      const page = await listCountriesPage(offset, search);
      setCountryOptions((current) =>
        sortByLabel(reset ? page : mergeUnique(current, page), displayCountry)
      );
      setCountries((current) => mergeUnique(current, page));
      setCountryOffset(offset + page.length);
      setCountryHasMore(page.length === cityPickerPageSize);
    } catch (error) {
      notifyError(t("tutors.errors.loadLookups"), error);
    } finally {
      setCityPickerLoading(false);
    }
  };

  const loadStateOptions = async (countryId: string, reset = true, search = citySearch) => {
    const offset = reset ? 0 : stateOffset;
    setCityPickerLoading(true);
    try {
      const page = await listStatesPage(countryId, offset, search);
      setStateOptions((current) =>
        sortByLabel(reset ? page : mergeUnique(current, page), displayState)
      );
      setStates((current) => mergeUnique(current, page));
      setStateOffset(offset + page.length);
      setStateHasMore(page.length === cityPickerPageSize);
    } catch (error) {
      notifyError(t("tutors.errors.loadLookups"), error);
    } finally {
      setCityPickerLoading(false);
    }
  };

  const loadCityOptions = async (stateId: string, reset = true, search = citySearch) => {
    const offset = reset ? 0 : cityOffset;
    setCityPickerLoading(true);
    try {
      const page = await listCitiesPage(stateId, offset, search);
      setCityOptions((current) =>
        sortByLabel(reset ? page : mergeUnique(current, page), (city) => displayCity(city, stateById))
      );
      setCities((current) => mergeUnique(current, page));
      setCityOffset(offset + page.length);
      setCityHasMore(page.length === cityPickerPageSize);
    } catch (error) {
      notifyError(t("tutors.errors.loadLookups"), error);
    } finally {
      setCityPickerLoading(false);
    }
  };

  const resetCityPicker = () => {
    setCitySearch("");
    setCityPickerLevel("countries");
    setCityPickerCountryId(null);
    setCityPickerStateId(null);
    setCountryOptions([]);
    setStateOptions([]);
    setCityOptions([]);
    setCountryOffset(0);
    setStateOffset(0);
    setCityOffset(0);
    setCountryHasMore(false);
    setStateHasMore(false);
    setCityHasMore(false);
  };

  const openCityPicker = async () => {
    resetCityPicker();
    setCityModalOpen(true);

    if (!draft.cityId) {
      await loadCountryOptions(true, "");
      return;
    }

    setCityPickerLoading(true);
    try {
      const city =
        cityById.get(draft.cityId) ??
        (await broker.getDataPlain({ route: `/api/cities/${draft.cityId}`, method: "GET" }) as { data: CityRecord }).data;
      const state = city.stateId
        ? stateById.get(city.stateId) ??
          (await broker.getDataPlain({ route: `/api/states/${city.stateId}`, method: "GET" }) as { data: StateRecord }).data
        : null;
      const country = state?.countryId
        ? countryById.get(state.countryId) ??
          (await broker.getDataPlain({ route: `/api/countries/${state.countryId}`, method: "GET" }) as { data: CountryRecord }).data
        : null;

      if (city) setCities((current) => mergeUnique(current, [city]));
      if (state) setStates((current) => mergeUnique(current, [state]));
      if (country) setCountries((current) => mergeUnique(current, [country]));

      const [countryPage, statePage, cityPage] = await Promise.all([
        listCountriesPage(0, ""),
        country?.id ? listStatesPage(country.id, 0, "") : Promise.resolve([]),
        state?.id ? listCitiesPage(state.id, 0, "") : Promise.resolve([]),
      ]);

      setCityPickerCountryId(country?.id ?? null);
      setCityPickerStateId(state?.id ?? null);
      setCityPickerLevel(state?.id ? "cities" : country?.id ? "states" : "countries");
      setCountryOptions(sortByLabel(country ? mergeUnique([country], countryPage) : countryPage, displayCountry));
      setStateOptions(sortByLabel(state ? mergeUnique([state], statePage) : statePage, displayState));
      setCityOptions(sortByLabel(city ? mergeUnique([city], cityPage) : cityPage, (item) => displayCity(item, stateById)));
      setCountryOffset(countryPage.length);
      setStateOffset(statePage.length);
      setCityOffset(cityPage.length);
      setCountryHasMore(countryPage.length === cityPickerPageSize);
      setStateHasMore(statePage.length === cityPickerPageSize);
      setCityHasMore(cityPage.length === cityPickerPageSize);
    } catch (error) {
      notifyError(t("tutors.errors.loadLookups"), error);
      await loadCountryOptions(true, "");
    } finally {
      setCityPickerLoading(false);
    }
  };

  const selectCityPickerRow = (id: string) => {
    if (cityPickerLevel === "countries") {
      setCityPickerCountryId(id);
      setCityPickerStateId(null);
      setCityPickerLevel("states");
      setCitySearch("");
      setStateOptions([]);
      setCityOptions([]);
      setStateOffset(0);
      setCityOffset(0);
      void loadStateOptions(id, true, "");
      return;
    }

    if (cityPickerLevel === "states") {
      setCityPickerStateId(id);
      setCityPickerLevel("cities");
      setCitySearch("");
      setCityOptions([]);
      setCityOffset(0);
      void loadCityOptions(id, true, "");
      return;
    }

    const city = cityOptions.find((option) => option.id === id);
    if (city) setCities((current) => mergeUnique(current, [city]));
    updateDraft("cityId", id);
    setCityModalOpen(false);
  };

  const cityPickerRows =
    cityPickerLevel === "countries"
      ? countryOptions.map((country) => ({
          id: country.id,
          primary: displayCountry(country),
          secondary: [country.abbreviation, country.bacenCode ? `BACEN ${country.bacenCode}` : null].filter(Boolean).join(" / "),
        }))
      : cityPickerLevel === "states"
        ? stateOptions.map((state) => ({
            id: state.id,
            primary: displayState(state),
            secondary: state.callCodes ?? "",
          }))
        : cityOptions.map((city) => ({
            id: city.id,
            primary: displayCity(city, stateById),
            secondary: "",
          }));

  const cityPickerSelectedId =
    cityPickerLevel === "countries"
      ? cityPickerCountryId
      : cityPickerLevel === "states"
        ? cityPickerStateId
        : draft.cityId;

  const cityPickerHasMore =
    cityPickerLevel === "countries"
      ? countryHasMore
      : cityPickerLevel === "states"
        ? stateHasMore
        : cityHasMore;

  const cityPickerTitle =
    cityPickerLevel === "countries"
      ? t("tutors.cityPicker.country")
      : cityPickerLevel === "states"
        ? t("tutors.cityPicker.state")
        : t("tutors.cityPicker.city");

  const goBackCityPicker =
    cityPickerLevel === "states"
      ? () => {
          setCitySearch("");
          setCityPickerLevel("countries");
        }
      : cityPickerLevel === "cities"
        ? () => {
            setCitySearch("");
            setCityPickerLevel("states");
          }
        : undefined;

  const searchCityPickerRows = (search: string) => {
    setCitySearch(search);
    if (cityPickerLevel === "countries") {
      void loadCountryOptions(true, search);
      return;
    }
    if (cityPickerLevel === "states" && cityPickerCountryId) {
      void loadStateOptions(cityPickerCountryId, true, search);
      return;
    }
    if (cityPickerLevel === "cities" && cityPickerStateId) {
      void loadCityOptions(cityPickerStateId, true, search);
    }
  };

  const loadMoreCityPickerRows = () => {
    if (cityPickerLoading || !cityPickerHasMore) return;
    if (cityPickerLevel === "countries") {
      void loadCountryOptions(false);
      return;
    }
    if (cityPickerLevel === "states" && cityPickerCountryId) {
      void loadStateOptions(cityPickerCountryId, false);
      return;
    }
    if (cityPickerLevel === "cities" && cityPickerStateId) {
      void loadCityOptions(cityPickerStateId, false);
    }
  };

  const handleCityPickerScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
      loadMoreCityPickerRows();
    }
  };

  const loadCreateDefaults = async (customerId: string, cityId: string) => {
    if (cityId) {
      await loadCityContext(cityId);
      return;
    }
    if (!customerId) return;

    try {
      const customer =
        (await broker.getDataPlain({ route: "/api/customers/" + customerId, method: "GET" }) as { data?: CustomerRecord }).data;
      if (!customer) return;

      setCustomers((current) => mergeUnique(current, [customer]));
      if (!customer.cityId) return;
      setDraft((current) => current.id || current.customerId !== customerId || current.cityId
        ? current
        : { ...current, cityId: customer.cityId || "" });
      await loadCityContext(customer.cityId);
    } catch (error) {
      notifyError(t("tutors.errors.loadLookups"), error);
    }
  };

  const reloadTutorDetails = useCallback(async (tutorId: string) => {
    try {
      const response = await broker.getDataPlain({ route: `/api/tutors/${tutorId}?fetchAnimals=true`, method: "GET" }) as { data?: TutorRecord };
      if (!response.data) return;
      const tutor = response.data;
      setTutors((current) => current.some((known) => known.id === tutor.id)
        ? current.map((known) => known.id === tutor.id ? tutor : known)
        : [...current, tutor]);
      setDetailsTarget(tutor);
    } catch (error) {
      notifyError(t("tutors.errors.load"), error);
    }
  }, [broker, notifyError, t]);

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; id?: string }>).detail;
      const id = detail?.id;
      if (event.type === "kahu:resource-deleted" && detail?.type === "tutor" && id && id === detailsTarget?.id && activityFrame) closeActivityFrame(activityFrame.id);
    };
    window.addEventListener("kahu:resource-deleted", refresh);
    return () => { window.removeEventListener("kahu:resource-deleted", refresh); };
  }, [activityFrame, closeActivityFrame, detailsTarget?.id]);

  const openAnimalsLookup = useCallback((tutor: TutorRecord) =>
    openLookup<AnimalRecord>({
      title: t("tutors.animalsTitle"),
      size: "lg",
      render: ({ resolve, cancel }) => (
        <Stack gap="sm" style={{ minHeight: tutorDetailsPageHeight }}>
          <Stack gap="xs" style={{ flex: 1, minHeight: 0 }}>
            {tutor.animals?.map((animal) => (
              <Paper
                key={animal.id}
                withBorder
                radius="sm"
                p="sm"
                onClick={() => resolve(animal)}
                style={{ cursor: "pointer" }}
              >
                <Text fw={700}>{animal.name || t("animals.unnamed")}</Text>
                <Text size="xs" c="dimmed">{displaySpeciesBreed(animal.speciesText, animal.breedText) || animal.id}</Text>
              </Paper>
            ))}
            {!tutor.animals?.length && <Text c="dimmed" ta="center" py="md">{t("animals.empty")}</Text>}
          </Stack>
          <Group justify="flex-end">
            <Button variant="subtle" color="light.1" onClick={cancel}>
              {t("common.actions.cancel")}
            </Button>
          </Group>
        </Stack>
      ),
    }), [openLookup, t]);

  const handleAnimalsLookup = useCallback(async (tutor: TutorRecord) => {
    const selectedAnimal = await openAnimalsLookup(tutor);
    if (!selectedAnimal) {
      await reloadTutorDetails(tutor.id);
      return;
    }
    openActivity({ type: "animal.details", resourceId: selectedAnimal.id });
  }, [openActivity, openAnimalsLookup, reloadTutorDetails]);

  const openCreate = () => {
    setDraftErrors({});
    setTouchedFields({});
    setSubmitAttempted(false);
    setFocusedField(null);
    setCitySearch("");
    setCityModalOpen(false);
    setDraft({
      ...emptyDraft,
      customerId: defaultTutorRelations.customerId,
      cityId: defaultTutorRelations.cityId,
    });
    setEditorDirty(false);
    setModalOpen(true);
    void loadCreateDefaults(defaultTutorRelations.customerId, defaultTutorRelations.cityId);
  };

  const closeEditor = useCallback(async (reloadCallee = true) => {
    const editedTutorId = draft.id;
    const activityId = editActivityIdRef.current;
    setModalOpen(false);
    setCityModalOpen(false);
    if (activityFrame) {
      if (reloadCallee && editedTutorId) window.dispatchEvent(new CustomEvent("kahu:resource-change", { detail: { type: "tutor", id: editedTutorId } }));
      closeActivityFrame(activityFrame.id);
      return;
    }
    if (activityId) {
      editActivityIdRef.current = null;
      endLocalActivity(activityId);
      if (editedTutorId) window.dispatchEvent(new CustomEvent("kahu:resource-change", { detail: { type: "tutor", id: editedTutorId } }));
      if (reloadCallee && editedTutorId) await reloadTutorDetails(editedTutorId);
      return;
    }
    if (
      location.pathname === "/home/tutors/details" ||
      location.pathname === "/home/tutor/details" ||
      (location.state && typeof location.state === "object" && "navigationFrameId" in location.state)
    ) {
      closeActivity("/home/tutors");
    }
  }, [activityFrame, closeActivity, closeActivityFrame, draft.id, endLocalActivity, location.pathname, location.state, reloadTutorDetails]);

  useEffect(() => {
    if (!modalOpen || draft.id || (draft.customerId && draft.cityId)) return;

    setDraft((current) => ({
      ...current,
      customerId: current.customerId || defaultTutorRelations.customerId,
      cityId: current.cityId || defaultTutorRelations.cityId,
    }));
  }, [defaultTutorRelations, draft.cityId, draft.customerId, draft.id, modalOpen]);

  const invalidFieldMessage = (fieldKey: TutorFieldTranslationKey) =>
    t("tutors.errors.invalidField", { field: t(fieldKey) });

  const validateDraftFields = (candidate: TutorDraft) => {
    const nextErrors: TutorDraftErrors = {};

    if (!candidate.name.trim()) nextErrors.name = invalidFieldMessage("common.fields.name");
    if (!candidate.cpf.trim()) nextErrors.cpf = invalidFieldMessage("common.fields.cpf");
    if (!candidate.phone.trim()) nextErrors.phone = invalidFieldMessage("common.fields.phone");
    if (!candidate.address.trim()) nextErrors.address = invalidFieldMessage("common.fields.address");
    if (!candidate.postalCode.trim()) nextErrors.postalCode = invalidFieldMessage("common.fields.postalCode");
    if (!candidate.cityId.trim()) nextErrors.cityId = invalidFieldMessage("common.fields.city");

    if (candidate.email.trim() && !isValidEmail(candidate.email)) nextErrors.email = invalidFieldMessage("common.fields.email");
    if (candidate.cpf.trim() && !isValidCpf(candidate.cpf)) nextErrors.cpf = invalidFieldMessage("common.fields.cpf");
    if (candidate.phone.trim() && !isValidPhone(candidate.phone)) nextErrors.phone = invalidFieldMessage("common.fields.phone");
    if (candidate.phone2.trim() && !isValidPhone(candidate.phone2)) nextErrors.phone2 = invalidFieldMessage("common.fields.phone2");
    if (candidate.postalCode.trim() && !isValidPostalCode(candidate.postalCode)) nextErrors.postalCode = invalidFieldMessage("common.fields.postalCode");

    return nextErrors;
  };

  const updateDraft = (field: keyof TutorDraft, value: string | null) => {
    setEditorDirty(true);
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setDraft((current) => {
      const nextDraft = { ...current, [field]: value ?? "" };
      setDraftErrors(validateDraftFields(nextDraft));
      return nextDraft;
    });
  };

  const validationProps = (field: keyof TutorDraft) => {
    const error = draftErrors[field];

    if (!error || !touchedFields[field]) return {};

    return {
      styles: {
        input: {
          borderColor: submitAttempted
            ? "var(--mantine-color-red-6)"
            : "var(--mantine-color-yellow-5)",
        },
      },
    };
  };

  const validationOverlay = (field: keyof TutorDraft, position: "left" | "right" = "right") => ({
    arrowSize: 8,
    color: "red",
    disabled: !submitAttempted || !draftErrors[field] || focusedField === field,
    events: { hover: false, focus: false, touch: false },
    label: draftErrors[field],
    multiline: true,
    offset: 14,
    opened: Boolean(submitAttempted && draftErrors[field] && focusedField !== field),
    position,
    withArrow: true,
    withinPortal: true,
    zIndex: 1900,
  });

  const focusProps = (field: keyof TutorDraft) => ({
    onBlur: () => setFocusedField((current) => (current === field ? null : current)),
    onFocus: () => setFocusedField(field),
  });

  const validateDraft = () => {
    const nextErrors = validateDraftFields(draft);

    setSubmitAttempted(true);
    setTouchedFields((current) => ({
      ...current,
      name: true,
      email: true,
      cpf: true,
      phone: true,
      phone2: true,
      address: true,
      postalCode: true,
      cityId: true,
    }));
    setDraftErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const payload = () => ({
    cityId: draft.cityId,
    customerId: draft.customerId,
    name: nullable(draft.name),
    cpf: nullable(onlyDigits(draft.cpf)),
    identity: nullable(draft.identity),
    email: nullable(draft.email.trim()),
    phone: nullable(onlyDigits(draft.phone)),
    phone2: nullable(onlyDigits(draft.phone2)),
    address: nullable(draft.address),
    postalCode: nullable(onlyDigits(draft.postalCode)),
  });

  const saveTutor = async () => {
    if (!validateDraft()) {
      notifications.show({
        color: "red",
        title: t("common.error.prefix"),
        message: t("tutors.errors.invalidFormats"),
        position: "top-center",
      });
      return;
    }

    if (!draft.cityId || !draft.customerId) {
      notifications.show({
        color: "red",
        title: t("common.error.prefix"),
        message: t("tutors.errors.requiredRelations"),
        position: "top-center",
      });
      return;
    }

    setSaving(true);
    try {
      if (draft.id) {
        await broker.putData({ route: "/api/tutors", data: { id: draft.id, ...payload() } });
      } else {
        await broker.postData({ route: "/api/tutors", data: payload() });
      }

      notifications.show({ color: "green", title: t("tutors.savedTitle"), message: t("tutors.savedMessage") });
      window.dispatchEvent(new CustomEvent("kahu:resource-change", { detail: { type: "tutor", id: draft.id } }));
      if (!activityOnly) await loadTutors();
      await closeEditor();
    } catch (error) {
      notifyError(t("tutors.errors.save"), error);
    } finally {
      setSaving(false);
    }
  };

  const deleteTutor = async (tutor: TutorRecord) => {
    setDeleting(true);
    try {
      await broker.deleteData({ route: "/api/tutors", data: { id: tutor.id } });
      notifications.show({ color: "green", title: t("tutors.deletedTitle"), message: t("tutors.deletedMessage") });
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent("kahu:resource-deleted", { detail: { type: "tutor", id: tutor.id } }));
      if (!activityOnly) await loadTutors();
      await closeEditor(false);
      closeDetails();
    } catch (error) {
      notifyError(t("tutors.errors.delete"), error);
    } finally {
      setDeleting(false);
    }
  };

  const applySearch = () => {
    setPageIndex(1);
    setAppliedSearch(search.trim());
  };

  useEffect(() => {
    const activity = activityFrame?.activity;
    if (!activity || handledActivityFrameRef.current === activityFrame.id) return;
    handledActivityFrameRef.current = activityFrame.id;
    const tutorId = activity.resourceId;
    if (activity.type === "tutor.create") { openCreate(); return; }
    if (!tutorId) { closeActivityFrame(activityFrame.id); return; }
    void (async () => {
      const response = await broker.getDataPlain({ route: `/api/tutors/${tutorId}?fetchAnimals=true`, method: "GET" }) as { data?: TutorRecord };
      const tutor = response.data;
      if (!tutor) { closeActivityFrame(activityFrame.id); return; }
      setTutors((current) => mergeUnique(current, [tutor]));
      if (activity.type === "tutor.edit") {
        setDraft(toDraft(tutor));
        setEditorDirty(false);
    setModalOpen(true);
      } else {
        setDetailsTarget(tutor);
      }
    })().catch((error) => notifyError(t("tutors.errors.load"), error));
  }, [activityFrame, broker, closeActivityFrame, notifyError, t]);

  return (
    <Stack gap="md" style={{ width: activityOnly ? undefined : "100%", minHeight: activityOnly ? undefined : "calc(100vh - 60px)" }}>
      {!activityOnly && <>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t("tutors.title")}</Title>
          <Text c="dimmed">{t("tutors.subtitle")}</Text>
        </div>
        <Button color="light.1" leftSection={<FeatherIcon icon="plus" size={16} />} onClick={() => openActivity({ type: "tutor.create" })}>
          {t("tutors.new")}
        </Button>
      </Group>

      <Paper withBorder radius="sm" p="md" style={{ background: "#fbfaff" }}>
        <Group align="flex-end" justify="space-between">
          <TextInput
            label={t("tutors.searchLabel")}
            placeholder={t("tutors.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            style={{ flex: 1, minWidth: 260 }}
          />
          <Group gap="xs">
            <Button color="light.1" onClick={applySearch}>
              {t("datatable.search.placeholder")}
            </Button>
            <Button
              variant="subtle"
              color="light.1"
              onClick={() => {
                setSearch("");
                setAppliedSearch("");
                setPageIndex(1);
              }}
            >
              {t("common.actions.clear")}
            </Button>
          </Group>
        </Group>
      </Paper>

      <Paper withBorder radius="sm" style={{ overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {loading ? (
          <Group justify="center" p="xl" style={{ flex: 1 }}>
            <Loader color="light.1" />
          </Group>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead style={{ background: "#f0effa" }}>
              <Table.Tr>
                <Table.Th>{t("common.fields.name")}</Table.Th>
                <Table.Th>{t("common.fields.phone")}</Table.Th>
                <Table.Th>{t("nav.animals")}</Table.Th>
                <Table.Th style={{ width: 110, textAlign: "right" }}>{t("tutors.actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tutors.map((tutor) => {
                const maskedCpf = formatMaskedCpfForTable(tutor.cpf);
                const animalNames = tutor.animals?.map((animal) => firstNameToken(animal.name)).filter(Boolean).join(", ");

                return (
                <Table.Tr key={tutor.id} onClick={() => openActivity({ type: "tutor.details", resourceId: tutor.id })} style={{ cursor: "pointer" }}>
                  <Table.Td>
                    <Text fw={700}>{tutor.name || t("tutors.unnamed")}</Text>
                    <Text size="xs" c="dimmed">{maskedCpf || tutor.identity || tutor.id}</Text>
                  </Table.Td>
                  <Table.Td>{tutor.phone ? formatPhone(tutor.phone) : <Text c="dimmed">-</Text>}</Table.Td>
                  <Table.Td>{animalNames || <Text c="dimmed">-</Text>}</Table.Td>
                  <Table.Td aria-label={t("tutors.actions")} onClick={(event) => event.stopPropagation()}>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Tooltip label={t("tutors.edit")}>
                        <ActionIcon
                          variant="subtle"
                          color="light.1"
                          aria-label={t("tutors.edit")}
                          onClick={() => openActivity({ type: "tutor.edit", resourceId: tutor.id })}
                        >
                          <FeatherIcon icon="edit-2" size={17} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={t("tutors.delete")}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={t("tutors.delete")}
                          onClick={() => setDeleteTarget(tutor)}
                        >
                          <FeatherIcon icon="trash-2" size={17} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
                );
              })}
              {!tutors.length && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" c="dimmed" py="xl">{t("tutors.empty")}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
          </div>
        )}
      </Paper>

      <Group justify="space-between" style={{ flexShrink: 0 }}>
        <Select
          value={String(pageSize)}
          data={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
          onChange={(value) => {
            setPageSize(Number(value ?? 10));
            setPageIndex(1);
          }}
          w={90}
        />
        <Pagination
          color="light.1"
          total={Math.max(1, Math.ceil(totalRows / pageSize))}
          value={pageIndex}
          onChange={setPageIndex}
        />
      </Group>

      </>}

      <Modal
        opened={Boolean(detailsTarget)}
        onClose={closeDetails}
        onResume={() => detailsTarget ? reloadTutorDetails(detailsTarget.id) : undefined}
        title={t("tutors.detailsTitle")}
        zIndex={activityFrame ? activityLayer : undefined}
        size="lg"
        centered
      >
        {detailsTarget && (
          <Stack gap="sm" style={{ minHeight: tutorDetailsPageHeight }}>
            <Paper withBorder radius="sm" p="sm" style={{ width: "100%" }}>
              <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.name")}</Text>
              <Text fw={700}>{detailsTarget.name || t("tutors.unnamed")}</Text>
            </Paper>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.cpf")}</Text>
                <Text fw={700}>{detailsTarget.cpf ? formatCpf(detailsTarget.cpf) : "-"}</Text>
              </Paper>
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.identity")}</Text>
                <Text fw={700}>{detailsTarget.identity || "-"}</Text>
              </Paper>
              {renderPhoneDetail(t("common.fields.phone"), detailsTarget.phone)}
              {renderPhoneDetail(t("common.fields.phone2"), detailsTarget.phone2)}
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.email")}</Text>
                <Text fw={700}>{detailsTarget.email || "-"}</Text>
              </Paper>
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.postalCode")}</Text>
                <Text fw={700}>{detailsTarget.postalCode ? formatPostalCode(detailsTarget.postalCode) : "-"}</Text>
              </Paper>
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.city")}</Text>
                <Text fw={700}>{displayCity(cityById.get(detailsTarget.cityId), stateById) || "-"}</Text>
              </Paper>
              <Paper
                withBorder
                radius="sm"
                p="sm"
                onClick={() => void handleAnimalsLookup(detailsTarget)}
                style={{ cursor: "pointer", position: "relative", paddingRight: "var(--kahu-inline-action)", minHeight: "var(--kahu-inline-action)" }}
              >
                <Text size="xs" c="dimmed" tt="uppercase">{t("nav.animals")}</Text>
                <Text fw={700}>{detailsTarget.animals?.map((animal) => firstNameToken(animal.name)).filter(Boolean).join(", ") || "-"}</Text>
                <Tooltip label={t("animals.new")} position="top" zIndex={1600} withinPortal>
                  <ActionIcon
                    variant="subtle"
                    color="light.1"
                    aria-label={t("animals.new")}
                    onClick={(event) => {
                      event.stopPropagation();
                      openActivity({ type: "animal.create", payload: { tutorId: detailsTarget.id } });
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: "var(--kahu-inline-action)",
                      height: "100%",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderLeft: "1px solid #d7d4e8",
                    }}
                  >
                    <FeatherIcon icon="plus" size={32} />
                  </ActionIcon>
                </Tooltip>
              </Paper>
            </SimpleGrid>
            {renderAddressDetail(detailsTarget)}
            <Group justify="flex-end">
              <Button variant="subtle" color="light.1" onClick={closeDetails}>{detailCloseLabel}</Button>
              <Button color="light.1" onClick={() => openActivity({ type: "tutor.edit", resourceId: detailsTarget.id })}>{t("tutors.edit")}</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <SecondaryModal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("tutors.deleteConfirmTitle")}
        size="sm"
        centered
        zIndex={1500}
      >
        <Stack gap="md">
          <Text>
            {t("tutors.confirmDelete", {
              name: deleteTarget?.name || deleteTarget?.email || deleteTarget?.id || "",
            })}
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="light.1" onClick={() => setDeleteTarget(null)}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={() => {
                if (deleteTarget) void deleteTutor(deleteTarget);
              }}
            >
              {t("tutors.delete")}
            </Button>
          </Group>
        </Stack>
      </SecondaryModal>
      <Modal
        opened={modalOpen}
        onClose={() => requestDiscard(() => void closeEditor())}
        dirty={editorDirty}
        title={draft.id ? t("tutors.editTitle") : t("tutors.createTitle")}
        size="lg"
        centered
        zIndex={activityFrame ? activityLayer : 1300}
      >
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Tooltip {...validationOverlay("name", "left")}>
              <TextInput label={t("common.fields.name")} value={draft.name} onChange={(event) => updateDraft("name", event.currentTarget.value)} required {...focusProps("name")} {...validationProps("name")} />
            </Tooltip>
            <Tooltip {...validationOverlay("email", "right")}>
              <TextInput label={t("common.fields.email")} value={draft.email} onChange={(event) => updateDraft("email", event.currentTarget.value)} {...focusProps("email")} {...validationProps("email")} />
            </Tooltip>
            <Tooltip {...validationOverlay("cpf", "left")}>
              <TextInput label={t("common.fields.cpf")} value={draft.cpf} onChange={(event) => updateDraft("cpf", formatCpf(event.currentTarget.value))} required {...focusProps("cpf")} {...validationProps("cpf")} />
            </Tooltip>
            <TextInput label={t("common.fields.identity")} value={draft.identity} onChange={(event) => updateDraft("identity", event.currentTarget.value)} />
            <Tooltip {...validationOverlay("phone", "left")}>
              <TextInput label={t("common.fields.phone")} value={draft.phone} onChange={(event) => updateDraft("phone", formatPhone(event.currentTarget.value))} required {...focusProps("phone")} {...validationProps("phone")} />
            </Tooltip>
            <Tooltip {...validationOverlay("phone2", "right")}>
              <TextInput label={t("common.fields.phone2")} value={draft.phone2} onChange={(event) => updateDraft("phone2", formatPhone(event.currentTarget.value))} {...focusProps("phone2")} {...validationProps("phone2")} />
            </Tooltip>
            <Tooltip {...validationOverlay("address", "right")}>
              <TextInput label={t("common.fields.address")} value={draft.address} onChange={(event) => updateDraft("address", event.currentTarget.value)} required style={{ gridColumn: "1 / -1" }} {...focusProps("address")} {...validationProps("address")} />
            </Tooltip>
            <Tooltip {...validationOverlay("postalCode", "left")}>
              <TextInput label={t("common.fields.postalCode")} value={draft.postalCode} onChange={(event) => updateDraft("postalCode", formatPostalCode(event.currentTarget.value))} required {...focusProps("postalCode")} {...validationProps("postalCode")} />
            </Tooltip>
            <Tooltip {...validationOverlay("cityId", "right")}>
              <TextInput
                label={t("common.fields.city")}
                value={selectedCityLabel}
                required
                placeholder={t("tutors.selectCity")}
                readOnly
                onClick={() => void openCityPicker()}
                {...focusProps("cityId")}
                rightSection={<FeatherIcon icon="map-pin" size={16} />}
                styles={{ input: { cursor: "pointer", ...(validationProps("cityId").styles?.input ?? {}) } }}
              />
            </Tooltip>
          </SimpleGrid>
          <Group justify="space-between" mt="sm">
            <div>
              {draft.id && (
                <Button
                  variant="light"
                  color="red"
                  leftSection={<FeatherIcon icon="trash-2" size={16} />}
                  onClick={() => {
                    const tutor = tutors.find((item) => item.id === draft.id);
                    setDeleteTarget(tutor ?? {
                      id: draft.id!,
                      name: draft.name,
                      cpf: draft.cpf,
                      identity: draft.identity,
                      email: draft.email,
                      phone: draft.phone,
                      phone2: draft.phone2,
                      address: draft.address,
                      postalCode: draft.postalCode,
                      cityId: draft.cityId,
                      customerId: draft.customerId,
                    });
                  }}
                >
                  {t("tutors.delete")}
                </Button>
              )}
            </div>
            <Group gap="xs">
              <Button variant="subtle" color="light.1" onClick={() => requestDiscard(() => void closeEditor())}>
                {t("common.actions.cancel")}
              </Button>
              <Button color="light.1" loading={saving} onClick={() => void saveTutor()}>
                {t("common.actions.save")}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
      <SecondaryModal
        opened={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        title={t("tutors.selectCity")}
        size="md"
        centered
        zIndex={1400}
      >
        <Stack gap="sm">
          <Group gap="xs" align="flex-end">
            {goBackCityPicker && (
              <Button
                variant="subtle"
                color="light.1"
                onClick={goBackCityPicker}
                px="xs"
              >
                <FeatherIcon icon="arrow-left" size={16} />
              </Button>
            )}
            <TextInput
              label={cityPickerTitle}
              placeholder={t("tutors.citySearchPlaceholder")}
              value={citySearch}
              onChange={(event) => searchCityPickerRows(event.currentTarget.value)}
              leftSection={<FeatherIcon icon="search" size={16} />}
              style={{ flex: 1 }}
            />
          </Group>
          <Stack gap={4} style={{ height: 360, overflowY: "auto" }} onScroll={handleCityPickerScroll}>
            {cityPickerLoading && !cityPickerRows.length && (
              <Group justify="center" p="md">
                <Loader color="light.1" size="sm" />
              </Group>
            )}
            {cityPickerRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => selectCityPickerRow(row.id)}
                style={{
                  border: row.id === cityPickerSelectedId ? "1px solid var(--mantine-color-light-4)" : "1px solid transparent",
                  borderRadius: 6,
                  background: row.id === cityPickerSelectedId ? "#f0effa" : "transparent",
                  cursor: "pointer",
                  padding: "8px 10px",
                  textAlign: "left",
                }}
              >
                <Text fw={600}>{row.primary}</Text>
                {row.secondary && <Text size="xs" c="dimmed">{row.secondary}</Text>}
              </button>
            ))}
            {cityPickerLoading && cityPickerRows.length > 0 && (
              <Group justify="center" p="xs">
                <Loader color="light.1" size="xs" />
              </Group>
            )}
            {!cityPickerLoading && !cityPickerRows.length && <Text c="dimmed" ta="center" py="md">{t("tutors.noCities")}</Text>}
          </Stack>
        </Stack>
      </SecondaryModal>
    </Stack>
  );
}
