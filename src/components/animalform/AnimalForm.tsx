import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { UIEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ActionIcon,
  Button,
  Checkbox,
  FileInput,
  Group,
  Image,
  Loader,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import FeatherIcon from "feather-icons-react";
import { ActivityModal as Modal, SecondaryModal, useActivityDiscardGuard } from "../activity/ActivityModal";
import { UserContext, UserContextInterface } from "../../classes/contexts/UserContext";
import { useModuleState } from "../../classes/contexts/ModuleStateContext";
import { useDetailTransition } from "../../classes/contexts/DetailTransitionContext";
import { NavigationFrame, useNavigationStack } from "../../classes/contexts/NavigationStackContext";
import ApiBroker from "../../primitives/ApiBroker";
import { useI18n } from "../../i18n/I18nContext";
import { shouldShowRequestError } from "../../classes/utils/requestErrors";
import type { TranslationKey } from "../../i18n/dictionaries";
import kahuDictionaries from "../../dictionaries/dictionaries.json";

type AnimalSize = "MINI" | "SMALL" | "MEDIUM" | "LARGE" | "GIANT";
type AnimalSex = "MALE" | "FEMALE";
type ConditionImportance = "red" | "yellow" | "green";
type DogCondition = { index: number; name: string; description: string; importance: ConditionImportance; references: string };
const dogConditions = kahuDictionaries.dogConditions as DogCondition[];
const conditionImportanceOrder: ConditionImportance[] = ["red", "yellow", "green"];
const conditionColors: Record<ConditionImportance, string> = { red: "red", yellow: "yellow", green: "green" };

type AnimalRecord = {
  id: string;
  numericId?: string | number;
  primaryTutorId: string;
  customerId: string;
  name?: string | null;
  speciesId?: string | null;
  speciesText?: string | null;
  breedId?: string | null;
  breedText?: string | null;
  color?: string | null;
  sex?: AnimalSex | null;
  birthDate?: string | null;
  weightKg?: string | number | null;
  size?: AnimalSize | null;
  description?: string | null;
  humanFamily?: string | null;
  petFamily?: string | null;
  picture?: string | null;
  conditions?: string | null;
  tutor?: TutorRecord | null;
};

type TutorRecord = {
  id: string;
  name?: string | null;
  cpf?: string | null;
  identity?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  address?: string | null;
  postalCode?: string | null;
  cityId?: string | null;
  customerId: string;
};

type SpeciesRecord = {
  id: string;
  commonName?: string | null;
  alternateNames?: string | null;
  scientificName?: string | null;
};

type BreedRecord = {
  id: string;
  commonName?: string | null;
  alternateNames?: string | null;
  speciesId: string;
};

type SpeciesBreedPickerLevel = "species" | "breeds";

type AnimalListState = {
  pageIndex: number;
  pageSize: number;
  search: string;
  appliedSearch: string;
};

type AnimalDraft = {
  id?: string;
  primaryTutorId: string;
  customerId: string;
  name: string;
  speciesId: string;
  speciesText: string;
  breedId: string;
  breedText: string;
  color: string;
  sex: AnimalSex | "";
  birthDate: string;
  weightKg: string;
  size: AnimalSize | "";
  description: string;
  humanFamily: string;
  petFamily: string;
  picture: string;
  conditions: string;
};

type AnimalDraftErrors = Partial<Record<keyof AnimalDraft, string>>;
type AnimalTouchedFields = Partial<Record<keyof AnimalDraft, boolean>>;
type AnimalFieldTranslationKey = Extract<
  TranslationKey,
  | "common.fields.name"
  | "common.fields.primaryTutor"
  | "common.fields.weightKg"
>;

const defaultAnimalListState: AnimalListState = {
  pageIndex: 1,
  pageSize: 10,
  search: "",
  appliedSearch: "",
};

const emptyDraft: AnimalDraft = {
  primaryTutorId: "",
  customerId: "",
  name: "",
  speciesId: "",
  speciesText: "",
  breedId: "",
  breedText: "",
  color: "",
  sex: "",
  birthDate: "",
  weightKg: "",
  size: "MEDIUM",
  description: "",
  humanFamily: "",
  petFamily: "",
  picture: "",
  conditions: "",
};

const pageSizeOptions = [10, 25, 50];
const tutorPageSize = 50;
const speciesBreedPageSize = 50;
const animalSizeOptions = ["MINI", "SMALL", "MEDIUM", "LARGE", "GIANT"] as const;
const animalSizeLabelKeys: Record<AnimalSize, TranslationKey> = {
  MINI: "animals.size.mini",
  SMALL: "animals.size.small",
  MEDIUM: "animals.size.medium",
  LARGE: "animals.size.large",
  GIANT: "animals.size.giant",
};
const animalSizeIllustrations: Record<AnimalSize, string> = {
  MINI: "/icons/size-mini.svg",
  SMALL: "/icons/size-small.svg",
  MEDIUM: "/icons/size-medium.svg",
  LARGE: "/icons/size-large.svg",
  GIANT: "/icons/size-giant.svg",
};

const valueOrEmpty = (value?: string | null) => value ?? "";
const displayBirthDate = (value: string | null | undefined, locale: string) => {
  const match = value?.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
};
const nullable = (value: string) => value.trim() || null;
const nullableWeight = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const isValidWeightKg = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return true;

  if (!/^\d+([,.]\d{1,3})?$/.test(normalized)) return false;

  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0;
};
const displayTutor = (tutor?: TutorRecord) =>
  tutor ? tutor.name || tutor.cpf || tutor.phone || tutor.id : "";

const displaySpeciesBreed = (speciesText?: string | null, breedText?: string | null) =>
  [speciesText, breedText].map(valueOrEmpty).filter(Boolean).join(" - ");

const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
  const records = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => records.set(item.id, item));
  return [...records.values()];
};

const resourceIdFromState = (state: unknown, keys: string[]) => {
  if (!state || typeof state !== "object") return "";

  const record = state as Record<string, unknown>;
  const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === "string" && candidate.trim());

  return typeof value === "string" ? value.trim() : "";
};

const displayWeightKg = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "";

  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return "";

  return `${parsed.toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`;
};

function SizeReferenceIllustration({ size }: { size: AnimalSize }) {
  return (
    <div aria-hidden style={{ position: "relative", width: "100%", height: 132 }}>
      {animalSizeOptions.map((option) => (
        <img
          key={option}
          src={animalSizeIllustrations[option]}
          alt=""
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "block",
            height: 132,
            maxWidth: "100%",
            margin: "0 auto",
            objectFit: "contain",
            opacity: option === size ? 1 : 0,
            transition: "opacity 260ms ease",
          }}
        />
      ))}
    </div>
  );
}

function AnimalSizeSelector({
  value,
  onChange,
  t,
}: {
  value: AnimalSize | "";
  onChange: (value: AnimalSize) => void;
  t: (key: TranslationKey) => string;
}) {
  const selectedIndex = Math.max(0, animalSizeOptions.indexOf(value || "MEDIUM"));
  const selected = animalSizeOptions[selectedIndex];

  const move = (direction: -1 | 1) => {
    const nextIndex = Math.min(animalSizeOptions.length - 1, Math.max(0, selectedIndex + direction));
    onChange(animalSizeOptions[nextIndex]);
  };

  return (
    <Stack gap={6} style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
      <Text size="sm" fw={500}>{t("common.fields.animalSize")}</Text>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 176,
          border: "1px solid #d7d4e8",
          borderRadius: 8,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          disabled={selectedIndex === 0}
          onClick={() => move(-1)}
          aria-label={t("common.actions.back")}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 48,
            border: 0,
            borderRight: "1px solid #e3e0f1",
            background: selectedIndex === 0 ? "#f7f6fb" : "#f0effa",
            color: selectedIndex === 0 ? "#b6b2cf" : "#4f55a8",
            cursor: selectedIndex === 0 ? "not-allowed" : "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <FeatherIcon icon="chevron-left" size={22} />
        </button>

        <div
          style={{
            position: "absolute",
            left: 48,
            right: 48,
            top: 10,
            bottom: 36,
            display: "grid",
            placeItems: "end center",
          }}
        >
          <SizeReferenceIllustration size={selected} />
        </div>

        <button
          type="button"
          disabled={selectedIndex === animalSizeOptions.length - 1}
          onClick={() => move(1)}
          aria-label={t("common.actions.apply")}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 48,
            border: 0,
            borderLeft: "1px solid #e3e0f1",
            background: selectedIndex === animalSizeOptions.length - 1 ? "#f7f6fb" : "#f0effa",
            color: selectedIndex === animalSizeOptions.length - 1 ? "#b6b2cf" : "#4f55a8",
            cursor: selectedIndex === animalSizeOptions.length - 1 ? "not-allowed" : "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <FeatherIcon icon="chevron-right" size={22} />
        </button>

        <Text
          size="sm"
          fw={700}
          c="#4f55a8"
          ta="center"
          style={{ position: "absolute", left: 48, right: 48, bottom: 10, height: 22 }}
        >
          {t(animalSizeLabelKeys[selected])}
        </Text>
      </div>
    </Stack>
  );
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string | null): boolean => Boolean(value && uuidPattern.test(value));

const normalizePictureResourceId = (picture?: string | null): string => {
  const value = valueOrEmpty(picture);
  if (!value) return "";
  if (isUuid(value)) return value;

  const resourceContentMatch = value.match(/\/api\/resources\/([^/]+)\/content$/);
  if (resourceContentMatch) {
    const decoded = decodeURIComponent(resourceContentMatch[1]);
    return isUuid(decoded) ? decoded : "";
  }

  return "";
};

const resourceContentRoute = (resourceId: string): string => `/api/resources/${encodeURIComponent(resourceId)}/content`;

const toDraft = (animal: AnimalRecord): AnimalDraft => ({
  id: animal.id,
  primaryTutorId: animal.primaryTutorId,
  customerId: animal.customerId,
  name: valueOrEmpty(animal.name),
  speciesId: valueOrEmpty(animal.speciesId),
  speciesText: valueOrEmpty(animal.speciesText),
  breedId: valueOrEmpty(animal.breedId),
  breedText: valueOrEmpty(animal.breedText),
  color: valueOrEmpty(animal.color),
  sex: animal.sex ?? "",
  birthDate: valueOrEmpty(animal.birthDate).slice(0, 10),
  weightKg: animal.weightKg === null || animal.weightKg === undefined ? "" : String(animal.weightKg),
  size: animal.size ?? "MEDIUM",
  description: valueOrEmpty(animal.description),
  humanFamily: valueOrEmpty(animal.humanFamily),
  petFamily: valueOrEmpty(animal.petFamily),
  picture: normalizePictureResourceId(animal.picture),
  conditions: valueOrEmpty(animal.conditions),
});

export default function AnimalForm({ activityFrame, activityLayer = 1000 }: { activityFrame?: NavigationFrame; activityLayer?: number } = {}) {
  const userContext = useContext(UserContext) as UserContextInterface;
  const broker = useMemo(() => new ApiBroker(userContext.config.apiData), [userContext.config.apiData]);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { completeDetailTransition } = useDetailTransition();
  const { clearNavigationStack, closeActivity, closeActivityFrame, endLocalActivity, frames, openActivity } = useNavigationStack();
  const activityIndex = activityFrame ? frames.filter((frame) => frame.activity).findIndex((frame) => frame.id === activityFrame.id) : 0;
  const detailCloseLabel = t(activityIndex > 0 ? "common.actions.back" : "common.actions.cancel");
  const activityOnly = Boolean(activityFrame?.activity);
  const requestDiscard = useActivityDiscardGuard();

  const [animals, setAnimals] = useState<AnimalRecord[]>([]);
  const [tutors, setTutors] = useState<TutorRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [listState, setListState] = useModuleState<AnimalListState>("animals.list", defaultAnimalListState);
  const { pageIndex, pageSize, search, appliedSearch } = listState;
  const setPageIndex = (pageIndex: number) => setListState((current) => ({ ...current, pageIndex }));
  const setPageSize = (pageSize: number) => setListState((current) => ({ ...current, pageSize }));
  const setSearch = (search: string) => setListState((current) => ({ ...current, search }));
  const setAppliedSearch = (appliedSearch: string) => setListState((current) => ({ ...current, appliedSearch }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receptionStarting, setReceptionStarting] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedConditionGroup, setExpandedConditionGroup] = useState<ConditionImportance | null>(null);
  const [conditionLookupSelection, setConditionLookupSelection] = useState<Set<number>>(new Set());
  const [tutorModalOpen, setTutorModalOpen] = useState(false);
  const [tutorSearch, setTutorSearch] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [speciesBreedModalOpen, setSpeciesBreedModalOpen] = useState(false);
  const [speciesBreedLevel, setSpeciesBreedLevel] = useState<SpeciesBreedPickerLevel>("species");
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [breedSearch, setBreedSearch] = useState("");
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesRecord[]>([]);
  const [breedOptions, setBreedOptions] = useState<BreedRecord[]>([]);
  const [speciesOffset, setSpeciesOffset] = useState(0);
  const [breedOffset, setBreedOffset] = useState(0);
  const [speciesHasMore, setSpeciesHasMore] = useState(false);
  const [breedHasMore, setBreedHasMore] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesRecord | null>(null);
  const [speciesBreedLoading, setSpeciesBreedLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnimalRecord | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<AnimalRecord | null>(null);
  const [draft, setDraft] = useState<AnimalDraft>(emptyDraft);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imagePreviewName, setImagePreviewName] = useState("");
  const [imagePreviewLoading, setImagePreviewLoading] = useState(false);
  const [imageDeleting, setImageDeleting] = useState(false);
  const [imageDeleteConfirmOpen, setImageDeleteConfirmOpen] = useState(false);
  const [draftErrors, setDraftErrors] = useState<AnimalDraftErrors>({});
  const [touchedFields, setTouchedFields] = useState<AnimalTouchedFields>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusedField, setFocusedField] = useState<keyof AnimalDraft | null>(null);
  const handledDetailsRouteRef = useRef<string | null>(null);
  const editActivityIdRef = useRef<string | null>(null);
  const handledActivityFrameRef = useRef<string | null>(null);
  const handledCreateRouteRef = useRef<string | null>(null);

  const completeRouteTransition = useCallback((transitionId: string) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => completeDetailTransition(transitionId));
    });
  }, [completeDetailTransition]);

  const tutorById = useMemo(() => new Map(tutors.map((tutor) => [tutor.id, tutor])), [tutors]);
  const selectedTutorLabel = displayTutor(tutorById.get(draft.primaryTutorId));
  const selectedSpeciesBreedLabel = displaySpeciesBreed(draft.speciesText, draft.breedText);

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

  const loadTutors = useCallback(async (searchValue = tutorSearch) => {
    setTutorLoading(true);
    try {
      const response = await broker.getData({
        route: "/api/tutors",
        method: "GET",
        query: {
          pageSize: tutorPageSize,
          pageIndex: 0,
          orders: [{ f: "name", d: "ASC" }],
          filters: searchValue.trim() ? [{ f: "name", o: "HAS", v: searchValue.trim() }] : [],
        },
      });
      setTutors(mergeById([], response.data as TutorRecord[]));
    } catch (error) {
      notifyError(t("animals.errors.loadTutors"), error);
    } finally {
      setTutorLoading(false);
    }
  }, [broker, notifyError, t, tutorSearch]);

  const loadSpecies = useCallback(async (searchValue = speciesSearch, append = false) => {
    const offset = append ? speciesOffset : 0;

    setSpeciesBreedLoading(true);
    try {
      const response = await broker.getData({
        route: "/api/species",
        method: "GET",
        query: {
          pageSize: speciesBreedPageSize,
          pageIndex: Math.floor(offset / speciesBreedPageSize),
          orders: [{ f: "name", d: "ASC" }],
          filters: searchValue.trim() ? [{ f: "name", o: "HAS", v: searchValue.trim() }] : [],
        },
      });
      const page = response.data as SpeciesRecord[];
      setSpeciesOptions((current) => append ? mergeById(current, page) : page);
      setSpeciesOffset(offset + page.length);
      setSpeciesHasMore(page.length === speciesBreedPageSize);
    } catch (error) {
      notifyError(t("animals.errors.loadSpeciesBreeds"), error);
    } finally {
      setSpeciesBreedLoading(false);
    }
  }, [broker, notifyError, speciesOffset, speciesSearch, t]);

  const loadBreeds = useCallback(async (speciesId: string, searchValue = breedSearch, append = false) => {
    const offset = append ? breedOffset : 0;

    setSpeciesBreedLoading(true);
    try {
      const response = await broker.getData({
        route: `/api/breeds/by-species/${speciesId}`,
        method: "GET",
        query: {
          pageSize: speciesBreedPageSize,
          pageIndex: Math.floor(offset / speciesBreedPageSize),
          orders: [{ f: "name", d: "ASC" }],
          filters: searchValue.trim() ? [{ f: "name", o: "HAS", v: searchValue.trim() }] : [],
        },
      });
      const page = response.data as BreedRecord[];
      setBreedOptions((current) => append ? mergeById(current, page) : page);
      setBreedOffset(offset + page.length);
      setBreedHasMore(page.length === speciesBreedPageSize);
    } catch (error) {
      notifyError(t("animals.errors.loadSpeciesBreeds"), error);
    } finally {
      setSpeciesBreedLoading(false);
    }
  }, [breedOffset, breedSearch, broker, notifyError, t]);

  const loadAnimals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await broker.getData({
        route: "/api/animals",
        method: "GET",
        query: {
          pageSize,
          pageIndex: pageIndex - 1,
          orders: [{ f: "name", d: "ASC" }],
          filters: appliedSearch ? [{ f: "name", o: "HAS", v: appliedSearch }] : [],
          options: { fetchTutor: true },
        },
      });
      const nextAnimals = response.data as AnimalRecord[];
      setAnimals(nextAnimals);
      setTutors((current) => mergeById(current, nextAnimals.map((animal) => animal.tutor).filter((tutor): tutor is TutorRecord => Boolean(tutor))));
      setTotalRows(response.pagination.totalRecords);
    } catch (error) {
      notifyError(t("animals.errors.load"), error);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, broker, notifyError, pageIndex, pageSize, t]);

  useEffect(() => {
    if (!activityOnly) void loadAnimals();
  }, [activityOnly, loadAnimals]);

  const closeDetails = useCallback(() => {
    setDetailsTarget(null);
    if (activityFrame) {
      closeActivityFrame(activityFrame.id);
      return;
    }

    if (location.pathname === "/home/animals/details" || location.pathname === "/home/animal/details") {
      closeActivity("/home/animals");
    }
  }, [activityFrame, closeActivity, closeActivityFrame, location.pathname]);

  useEffect(() => {
    if (activityOnly) return;
    const isDetailsRoute = location.pathname === "/home/animals/details" || location.pathname === "/home/animal/details";

    if (!isDetailsRoute) {
      handledDetailsRouteRef.current = null;
      return;
    }

    const animalId = resourceIdFromState(location.state, ["animalId", "resourceId", "id"]);
    const transitionId = resourceIdFromState(location.state, ["transitionId"]);
    if (!animalId) {
      if (transitionId) completeDetailTransition(transitionId);
      navigate("/home/animals", { replace: true });
      return;
    }

    const routeKey = `${location.key}:${animalId}`;
    if (handledDetailsRouteRef.current === routeKey) return;
    handledDetailsRouteRef.current = routeKey;
    openActivity({ type: "animal.details", resourceId: animalId });
    navigate("/home/animals", { replace: true, state: null });
    return;
  }, [activityOnly, animals, broker, completeDetailTransition, completeRouteTransition, location.key, location.pathname, location.state, navigate, notifyError, openActivity, t]);

  const closeImagePreview = () => {
    setImagePreviewOpen(false);
    setImagePreviewLoading(false);
    setImagePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const deleteAnimalImage = async () => {
    if (!draft.id || !draft.picture) return;

    setImageDeleting(true);
    try {
      const response = await broker.deleteRoute(`/api/animals/${draft.id}/image`) as { data?: AnimalRecord };
      const updatedAnimal = response.data;

      setDraft((current) => ({ ...current, picture: "" }));
      setImageFile(null);
      closeImagePreview();
      setImageDeleteConfirmOpen(false);

      if (updatedAnimal) {
        setAnimals((current) => current.map((animal) => (
          animal.id === updatedAnimal.id ? { ...animal, ...updatedAnimal, picture: null } : animal
        )));
      }
    } catch (error) {
      notifyError(t("animals.errors.deleteImage"), error);
    } finally {
      setImageDeleting(false);
    }
  };

  const openImagePreview = async (picture = draft.picture, animalName = draft.name) => {
    if (!picture) return;

    setImagePreviewName(animalName || t("animals.unnamed"));
    setImagePreviewOpen(true);
    setImagePreviewLoading(true);
    setImagePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });

    try {
      const blob = await broker.getBlob(resourceContentRoute(picture));
      setImagePreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      closeImagePreview();
      notifyError(t("animals.errors.loadImage"), error);
    } finally {
      setImagePreviewLoading(false);
    }
  };

  const startReception = async () => {
    if (!detailsTarget || receptionStarting) return;
    setReceptionStarting(true);
    try {
      await broker.postData({ route: "/api/presales/reception", data: { animalId: detailsTarget.id } });
      notifications.show({
        color: "green",
        title: t("animals.receptionStartedTitle"),
        message: t("animals.receptionStartedMessage", { name: detailsTarget.name || t("animals.unnamed") }),
        position: "top-center",
      });
      setDetailsTarget(null);
      clearNavigationStack();
      navigate("/home/main");
    } catch (error) {
      notifyError(t("animals.errors.startReception"), error);
    } finally {
      setReceptionStarting(false);
    }
  };

  const resetValidation = () => {
    setDraftErrors({});
    setTouchedFields({});
    setSubmitAttempted(false);
    setFocusedField(null);
  };

  const reloadAnimalDetails = useCallback(async (animalId: string) => {
    try {
      const response = await broker.getDataPlain({ route: `/api/animals/${animalId}?fetchTutor=true`, method: "GET" }) as { data?: AnimalRecord };
      if (!response.data) return;
      const animal = response.data;
      setAnimals((current) => mergeById(current, [animal]));
      if (animal.tutor) setTutors((current) => mergeById(current, [animal.tutor as TutorRecord]));
      setDetailsTarget(animal);
    } catch (error) {
      notifyError(t("animals.errors.load"), error);
    }
  }, [broker, notifyError, t]);

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; id?: string }>).detail;
      const id = detail?.id;
      if (event.type === "kahu:resource-deleted" && detail?.type === "animal" && id && id === detailsTarget?.id && activityFrame) closeActivityFrame(activityFrame.id);
    };
    window.addEventListener("kahu:resource-deleted", refresh);
    return () => { window.removeEventListener("kahu:resource-deleted", refresh); };
  }, [activityFrame, closeActivityFrame, detailsTarget?.id]);

  const openCreate = (preselectedTutor?: TutorRecord) => {
    resetValidation();
    setDraft(preselectedTutor ? {
      ...emptyDraft,
      primaryTutorId: preselectedTutor.id,
      customerId: preselectedTutor.customerId,
    } : emptyDraft);
    if (preselectedTutor) {
      setTutors((current) => mergeById(current, [preselectedTutor]));
    }
    setImageFile(null);
    setTutorSearch("");
    setSpeciesBreedModalOpen(false);
    setEditorDirty(false);
    setModalOpen(true);
  };

  useEffect(() => {
    if (activityOnly || !location.state || typeof location.state !== "object") return;
    const state = location.state as { action?: unknown; tutor?: unknown; transitionId?: unknown };
    if (state.action !== "new" || !state.tutor || typeof state.tutor !== "object") return;

    const tutor = state.tutor as TutorRecord;
    if (!tutor.id || !tutor.customerId) return;

    const routeKey = location.key + ":" + tutor.id;
    if (handledCreateRouteRef.current === routeKey) return;
    handledCreateRouteRef.current = routeKey;

    openActivity({ type: "animal.create", payload: { tutorId: tutor.id } });
    navigate(location.pathname, { replace: true, state: null });
    if (typeof state.transitionId === "string") completeRouteTransition(state.transitionId);
  }, [activityOnly, completeRouteTransition, location.key, location.pathname, location.state, navigate, openActivity]);

  const closeEditor = useCallback(async (reloadCallee = true) => {
    const editedAnimalId = draft.id;
    const activityId = editActivityIdRef.current;
    setModalOpen(false);
    setTutorModalOpen(false);
    setSpeciesBreedModalOpen(false);
    if (activityFrame) {
      if (reloadCallee && editedAnimalId) window.dispatchEvent(new CustomEvent("kahu:resource-change", { detail: { type: "animal", id: editedAnimalId } }));
      closeActivityFrame(activityFrame.id);
      return;
    }
    if (activityId) {
      editActivityIdRef.current = null;
      endLocalActivity(activityId);
      if (reloadCallee && editedAnimalId) await reloadAnimalDetails(editedAnimalId);
      return;
    }
    if (
      location.pathname === "/home/animals/details" ||
      location.pathname === "/home/animal/details" ||
      (location.state && typeof location.state === "object" && "navigationFrameId" in location.state)
    ) {
      closeActivity("/home/animals");
    }
  }, [activityFrame, closeActivity, closeActivityFrame, draft.id, endLocalActivity, location.pathname, location.state, reloadAnimalDetails]);

  const openTutorPicker = async () => {
    setTutorSearch("");
    setTutorModalOpen(true);
    await loadTutors("");
  };

  const openSpeciesBreedPicker = async () => {
    setSpeciesSearch("");
    setBreedSearch("");
    setBreedOptions([]);
    setSpeciesOptions([]);
    setSpeciesOffset(0);
    setBreedOffset(0);
    setSpeciesHasMore(false);
    setBreedHasMore(false);
    setSelectedSpecies(null);
    setSpeciesBreedLevel("species");
    setSpeciesBreedModalOpen(true);
    await loadSpecies("", false);
  };

  const selectSpecies = async (species: SpeciesRecord) => {
    setSelectedSpecies(species);
    setSpeciesBreedLevel("breeds");
    setBreedSearch("");
    setBreedOptions([]);
    setBreedOffset(0);
    setBreedHasMore(false);
    setDraft((current) => ({
      ...current,
      speciesId: species.id,
      speciesText: valueOrEmpty(species.commonName),
      breedId: "",
      breedText: "",
    }));
    await loadBreeds(species.id, "", false);
  };

  const handleSpeciesBreedScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (speciesBreedLoading || target.scrollHeight - target.scrollTop - target.clientHeight > 48) return;

    if (speciesBreedLevel === "species" && speciesHasMore) {
      void loadSpecies(speciesSearch, true);
      return;
    }

    if (speciesBreedLevel === "breeds" && selectedSpecies && breedHasMore) {
      void loadBreeds(selectedSpecies.id, breedSearch, true);
    }
  };

  const selectBreed = (breed: BreedRecord) => {
    setEditorDirty(true);
    setDraft((current) => ({
      ...current,
      breedId: breed.id,
      breedText: valueOrEmpty(breed.commonName),
    }));
    setSpeciesBreedModalOpen(false);
  };

  const applySearch = () => {
    setPageIndex(1);
    setAppliedSearch(search.trim());
  };

  const invalidFieldMessage = (fieldKey: AnimalFieldTranslationKey) =>
    t("tutors.errors.invalidField", { field: t(fieldKey) });

  const validateDraftFields = (candidate: AnimalDraft) => {
    const nextErrors: AnimalDraftErrors = {};

    if (!candidate.name.trim()) nextErrors.name = invalidFieldMessage("common.fields.name");
    if (!candidate.primaryTutorId.trim() || !candidate.customerId.trim()) {
      nextErrors.primaryTutorId = invalidFieldMessage("common.fields.primaryTutor");
    }
    if (candidate.weightKg.trim() && !isValidWeightKg(candidate.weightKg)) {
      nextErrors.weightKg = invalidFieldMessage("common.fields.weightKg");
    }

    return nextErrors;
  };

  const updateDraft = (field: keyof AnimalDraft, value: string) => {
    setEditorDirty(true);
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setDraft((current) => {
      const nextDraft = { ...current, [field]: value };
      setDraftErrors(validateDraftFields(nextDraft));
      return nextDraft;
    });
  };

  const validationProps = (field: keyof AnimalDraft) => {
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

  const validationOverlay = (field: keyof AnimalDraft, position: "left" | "right" = "right") => ({
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

  const focusProps = (field: keyof AnimalDraft) => ({
    onBlur: () => setFocusedField((current) => (current === field ? null : current)),
    onFocus: () => setFocusedField(field),
  });

  const validateDraft = () => {
    const nextErrors = validateDraftFields(draft);

    setSubmitAttempted(true);
    setTouchedFields((current) => ({
      ...current,
      name: true,
      primaryTutorId: true,
      weightKg: true,
    }));
    setDraftErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const selectTutor = (tutor: TutorRecord) => {
    setEditorDirty(true);
    setTouchedFields((current) => ({ ...current, primaryTutorId: true }));
    setDraft((current) => {
      const nextDraft = { ...current, primaryTutorId: tutor.id, customerId: tutor.customerId };
      setDraftErrors(validateDraftFields(nextDraft));
      return nextDraft;
    });
    setTutorModalOpen(false);
  };

  const payload = () => ({
    primaryTutorId: draft.primaryTutorId,
    customerId: draft.customerId,
    name: nullable(draft.name),
    speciesId: nullable(draft.speciesId),
    speciesText: nullable(draft.speciesText),
    breedId: nullable(draft.breedId),
    breedText: nullable(draft.breedText),
    color: nullable(draft.color),
    sex: draft.sex || null,
    birthDate: nullable(draft.birthDate),
    weightKg: nullableWeight(draft.weightKg),
    size: draft.size || "MEDIUM",
    description: nullable(draft.description),
    humanFamily: nullable(draft.humanFamily),
    petFamily: nullable(draft.petFamily),
    picture: nullable(draft.picture),
    conditions: nullable(draft.conditions),
  });

  const selectedConditionIndexes = useMemo(() => new Set(
    draft.conditions.split(",").map(Number).filter((index) => Number.isInteger(index) && index > 0)
  ), [draft.conditions]);

  const openConditionLookup = (importance: ConditionImportance) => {
    setConditionLookupSelection(new Set(selectedConditionIndexes));
    setExpandedConditionGroup(importance);
  };

  const toggleConditionLookup = (index: number, checked: boolean) => {
    setConditionLookupSelection((current) => {
      const next = new Set(current);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const confirmConditionLookup = () => {
    updateDraft("conditions", [...conditionLookupSelection].sort((left, right) => left - right).join(","));
    setExpandedConditionGroup(null);
  };

  const saveAnimal = async () => {
    if (!validateDraft()) {
      notifications.show({
        color: "red",
        title: t("common.error.prefix"),
        message: t("animals.errors.invalidFormats"),
        position: "top-center",
      });
      return;
    }

    setSaving(true);
    try {
      let savedAnimal: AnimalRecord | undefined;

      if (draft.id) {
        const response = await broker.putData({ route: "/api/animals", data: { id: draft.id, ...payload() } }) as { data?: AnimalRecord };
        savedAnimal = response.data;
      } else {
        const response = await broker.postData({ route: "/api/animals", data: payload() }) as { data?: AnimalRecord };
        savedAnimal = response.data;
      }

      if (imageFile && savedAnimal?.id) {
        const response = await broker.uploadFile({ route: `/api/animals/${savedAnimal.id}/image`, file: imageFile }) as { data?: AnimalRecord };
        savedAnimal = response.data ?? savedAnimal;
      }

      if (savedAnimal && draft.id) {
        const updatedAnimal = savedAnimal;
        const tutor = tutorById.get(updatedAnimal.primaryTutorId);
        setAnimals((current) => current.map((animal) => (
          animal.id === updatedAnimal.id ? { ...animal, ...updatedAnimal, tutor: tutor ?? animal.tutor ?? null } : animal
        )));
      } else {
        await loadAnimals();
      }

      notifications.show({ color: "green", title: t("animals.savedTitle"), message: t("animals.savedMessage") });
      window.dispatchEvent(new CustomEvent("kahu:resource-change", { detail: { type: "animal", id: savedAnimal?.id } }));
      setImageFile(null);
      await closeEditor();
    } catch (error) {
      notifyError(t("animals.errors.save"), error);
    } finally {
      setSaving(false);
    }
  };

  const deleteAnimal = async (animal: AnimalRecord) => {
    try {
      await broker.deleteData({ route: "/api/animals", data: { id: animal.id } });
      notifications.show({ color: "green", title: t("animals.deletedTitle"), message: t("animals.deletedMessage") });
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent("kahu:resource-deleted", { detail: { type: "animal", id: animal.id } }));
      if (!activityOnly) await loadAnimals();
      await closeEditor(false);
      closeDetails();
    } catch (error) {
      notifyError(t("animals.errors.delete"), error);
    }
  };

  useEffect(() => {
    const activity = activityFrame?.activity;
    if (!activity || handledActivityFrameRef.current === activityFrame.id) return;
    handledActivityFrameRef.current = activityFrame.id;
    if (activity.type === "animal.create") {
      const tutorId = typeof activity.payload?.tutorId === "string" ? activity.payload.tutorId : "";
      if (!tutorId) { openCreate(); return; }
      void broker.getDataPlain({ route: `/api/tutors/${tutorId}`, method: "GET" }).then((response) => {
        const tutor = (response as { data?: TutorRecord }).data;
        openCreate(tutor);
      }).catch((error) => notifyError(t("animals.errors.load"), error));
      return;
    }
    const animalId = activity.resourceId;
    if (!animalId) { closeActivityFrame(activityFrame.id); return; }
    void broker.getDataPlain({ route: `/api/animals/${animalId}?fetchTutor=true`, method: "GET" }).then((response) => {
      const animal = (response as { data?: AnimalRecord }).data;
      if (!animal) { closeActivityFrame(activityFrame.id); return; }
      setAnimals((current) => mergeById(current, [animal]));
      if (animal.tutor) setTutors((current) => mergeById(current, [animal.tutor as TutorRecord]));
      if (activity.type === "animal.edit") {
        setDraft(toDraft(animal));
        setEditorDirty(false);
    setModalOpen(true);
      } else setDetailsTarget(animal);
    }).catch((error) => notifyError(t("animals.errors.load"), error));
  }, [activityFrame, broker, closeActivityFrame, notifyError, t]);

  return (
    <Stack gap="md" style={{ width: activityOnly ? undefined : "100%", minHeight: activityOnly ? undefined : "calc(100vh - 60px)" }}>
      {!activityOnly && <>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t("animals.title")}</Title>
          <Text c="dimmed">{t("animals.subtitle")}</Text>
        </div>
        <Button color="light.1" leftSection={<FeatherIcon icon="plus" size={16} />} onClick={() => openActivity({ type: "animal.create" })}>
          {t("animals.new")}
        </Button>
      </Group>

      <Paper withBorder radius="sm" p="md" style={{ background: "#fbfaff" }}>
        <Group align="flex-end" justify="space-between">
          <TextInput
            label={t("animals.searchLabel")}
            placeholder={t("animals.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            style={{ flex: 1, minWidth: 260 }}
          />
          <Group gap="xs">
            <Button color="light.1" onClick={applySearch}>{t("datatable.search.placeholder")}</Button>
            <Button variant="subtle" color="light.1" onClick={() => { setSearch(""); setAppliedSearch(""); setPageIndex(1); }}>
              {t("common.actions.clear")}
            </Button>
          </Group>
        </Group>
      </Paper>

      <Paper withBorder radius="sm" style={{ overflow: "hidden", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {loading ? (
          <Group justify="center" p="xl" style={{ flex: 1 }}><Loader color="light.1" /></Group>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead style={{ background: "#f0effa" }}>
                <Table.Tr>
                  <Table.Th>{t("common.fields.name")}</Table.Th>
                  <Table.Th>{t("common.fields.animalSize")}</Table.Th>
                  <Table.Th>{t("common.fields.color")}</Table.Th>
                  <Table.Th>{t("common.fields.primaryTutor")}</Table.Th>
                  <Table.Th style={{ width: 110, textAlign: "right" }}>{t("tutors.actions")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {animals.map((animal) => (
                  <Table.Tr key={animal.id} onClick={() => openActivity({ type: "animal.details", resourceId: animal.id })} style={{ cursor: "pointer" }}>
                    <Table.Td>
                      <Text fw={700}>{animal.name || t("animals.unnamed")}</Text>
                      <Text size="xs" c="dimmed">{displaySpeciesBreed(animal.speciesText, animal.breedText) || "-"}</Text>
                    </Table.Td>
                    <Table.Td>{animal.size ? t(animalSizeLabelKeys[animal.size]) : <Text c="dimmed">-</Text>}</Table.Td>
                    <Table.Td>{animal.color || <Text c="dimmed">-</Text>}</Table.Td>
                    <Table.Td>{displayTutor(tutorById.get(animal.primaryTutorId)) || <Text c="dimmed">-</Text>}</Table.Td>
                    <Table.Td aria-label={t("tutors.actions")} onClick={(event) => event.stopPropagation()}>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Tooltip label={t("animals.edit")}>
                          <ActionIcon
                            variant="subtle"
                            color="light.1"
                            aria-label={t("animals.edit")}
                            onClick={() => openActivity({ type: "animal.edit", resourceId: animal.id })}
                          >
                            <FeatherIcon icon="edit-2" size={17} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t("animals.delete")}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={t("animals.delete")}
                            onClick={() => setDeleteTarget(animal)}
                          >
                            <FeatherIcon icon="trash-2" size={17} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {!animals.length && (
                  <Table.Tr>
                    <Table.Td colSpan={5}><Text ta="center" c="dimmed" py="xl">{t("animals.empty")}</Text></Table.Td>
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
          onChange={(value) => { setPageSize(Number(value ?? 10)); setPageIndex(1); }}
          w={90}
        />
        <Pagination color="light.1" total={Math.max(1, Math.ceil(totalRows / pageSize))} value={pageIndex} onChange={setPageIndex} />
      </Group>

      </>}

      <Modal
        opened={Boolean(detailsTarget)}
        onClose={closeDetails}
        onResume={() => detailsTarget ? reloadAnimalDetails(detailsTarget.id) : undefined}
        title={t("animals.detailsTitle")}
        zIndex={activityFrame ? activityLayer : undefined}
        size="lg"
        centered
      >
        {detailsTarget && (
          <Stack gap="sm">
            <Paper withBorder radius="sm" p="sm" style={{ width: "100%", position: "relative", paddingRight: "var(--kahu-inline-action)", minHeight: "var(--kahu-inline-action)" }}>
              <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.name")}</Text>
              <Text fw={700}>{detailsTarget.name || t("animals.unnamed")}</Text>
              <Tooltip label={detailsTarget.picture ? t("animals.showImage") : t("animals.noImage")} position="top" zIndex={1600} withinPortal>
                <span style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "var(--kahu-inline-action)" }}>
                  <ActionIcon
                    variant="subtle"
                    color={detailsTarget.picture ? "light.1" : "gray"}
                    disabled={!detailsTarget.picture}
                    aria-label={detailsTarget.picture ? t("animals.showImage") : t("animals.noImage")}
                    onClick={() => void openImagePreview(detailsTarget.picture ?? "", detailsTarget.name ?? "")}
                    style={{
                      width: "var(--kahu-inline-action)",
                      height: "100%",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderLeft: "1px solid #d7d4e8",
                    }}
                  >
                    <FeatherIcon icon="image" size={36} />
                  </ActionIcon>
                </span>
              </Tooltip>
            </Paper>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("animals.speciesBreed")}</Text>
                <Text fw={700}>{displaySpeciesBreed(detailsTarget.speciesText, detailsTarget.breedText) || "-"}</Text>
              </Paper>
              <Paper
                withBorder
                radius="sm"
                p="sm"
                onClick={() => {
                  if (!tutorById.get(detailsTarget.primaryTutorId)) return;
                  openActivity({ type: "tutor.details", resourceId: detailsTarget.primaryTutorId });
                }}
                style={{ cursor: tutorById.get(detailsTarget.primaryTutorId) ? "pointer" : "default" }}
              >
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.primaryTutor")}</Text>
                <Text fw={700}>{displayTutor(tutorById.get(detailsTarget.primaryTutorId)) || "-"}</Text>
              </Paper>
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.color")}</Text>
                <Text fw={700}>{detailsTarget.color || "-"}</Text>
              </Paper>
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.weightKg")}</Text>
                <Text fw={700}>{displayWeightKg(detailsTarget.weightKg) || "-"}</Text>
              </Paper>
            </SimpleGrid>
            <SimpleGrid cols={3} spacing="sm">
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.animalSize")}</Text>
                <Text fw={700}>{detailsTarget.size ? t(animalSizeLabelKeys[detailsTarget.size]) : "-"}</Text>
              </Paper>
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.sex")}</Text>
                <Text fw={700}>{detailsTarget.sex ? t(detailsTarget.sex === "MALE" ? "animals.sex.male" : "animals.sex.female") : "-"}</Text>
              </Paper>
              <Paper withBorder radius="sm" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.birthDate")}</Text>
                <Text fw={700}>{displayBirthDate(detailsTarget.birthDate, locale) || "-"}</Text>
              </Paper>
            </SimpleGrid>
            {(() => {
              const indexes = new Set((detailsTarget.conditions ?? "").split(",").map(Number).filter(Number.isInteger));
              const selected = dogConditions.filter((condition) => indexes.has(condition.index));
              return (
                <Paper withBorder radius="sm" p="sm" style={{ width: "100%" }}>
                  <Group justify="space-between" mb="sm">
                    <Text size="xs" c="dimmed" tt="uppercase">{t("animals.conditions")}</Text>
                    <Text size="xs" c="dimmed">{t("animals.conditions.selected", { count: String(selected.length) })}</Text>
                  </Group>
                  {!selected.length ? (
                    <Text fw={700}>{t("animals.conditions.none")}</Text>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                      {conditionImportanceOrder.map((importance) => {
                        const group = selected.filter((condition) => condition.importance === importance);
                        return (
                          <div key={importance} style={{ minWidth: 0, paddingLeft: 10, borderLeft: `4px solid var(--mantine-color-${conditionColors[importance]}-6)` }}>
                            <Text size="xs" fw={800} mb={6}>{t(`animals.conditions.${importance}` as TranslationKey)}</Text>
                            {!group.length && <Text size="sm" c="dimmed">-</Text>}
                            <Stack gap={5}>
                              {group.map((condition) => (
                                <Tooltip key={condition.index} label={condition.description} position="top" zIndex={1700} withinPortal multiline maw={360}>
                                  <Text size="sm" fw={600} style={{ cursor: "pointer", lineHeight: 1.25 }}>{condition.name}</Text>
                                </Tooltip>
                              ))}
                            </Stack>
                          </div>
                        );
                      })}
                    </SimpleGrid>
                  )}
                </Paper>
              );
            })()}
            <Paper withBorder radius="sm" p="sm">
              <Text size="xs" c="dimmed" tt="uppercase">{t("common.fields.description")}</Text>
              <Text fw={700}>{detailsTarget.description || "-"}</Text>
            </Paper>
            <Group justify="space-between">
              <Button color="light.1" loading={receptionStarting} onClick={() => void startReception()}>{t("animals.startReception")}</Button>
              <Group gap="xs">
                <Button variant="subtle" color="light.1" onClick={closeDetails}>{detailCloseLabel}</Button>
                <Button color="light.1" onClick={() => openActivity({ type: "animal.edit", resourceId: detailsTarget.id })}>{t("animals.edit")}</Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>

      <SecondaryModal opened={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t("animals.deleteConfirmTitle")} centered zIndex={1500}>
        <Stack>
          <Text>{t("animals.confirmDelete", { name: deleteTarget?.name || t("animals.unnamed") })}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="light.1" onClick={() => setDeleteTarget(null)}>{t("common.actions.cancel")}</Button>
            <Button color="red" onClick={() => { if (deleteTarget) void deleteAnimal(deleteTarget); }}>{t("animals.delete")}</Button>
          </Group>
        </Stack>
      </SecondaryModal>

      <Modal opened={modalOpen} onClose={() => requestDiscard(() => void closeEditor())} dirty={editorDirty} title={draft.id ? t("animals.editTitle") : t("animals.createTitle")} size="lg" centered zIndex={activityFrame ? activityLayer : 1300}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Tooltip {...validationOverlay("name", "left")}>
              <TextInput
                label={t("common.fields.name")}
                value={draft.name}
                onChange={(event) => updateDraft("name", event.currentTarget.value)}
                required
                {...validationProps("name")}
                {...focusProps("name")}
              />
            </Tooltip>
            <Tooltip {...validationOverlay("primaryTutorId", "right")}>
              <TextInput
                label={t("common.fields.primaryTutor")}
                value={selectedTutorLabel}
                placeholder={t("animals.selectTutor")}
                readOnly
                required
                onClick={() => void openTutorPicker()}
                rightSection={<FeatherIcon icon="search" size={16} />}
                {...focusProps("primaryTutorId")}
                styles={{
                  input: {
                    cursor: "pointer",
                    ...(validationProps("primaryTutorId").styles?.input ?? {}),
                  },
                }}
              />
            </Tooltip>
            <Stack gap="sm">
              <TextInput
                label={t("animals.speciesBreed")}
                value={selectedSpeciesBreedLabel}
                placeholder={t("animals.selectSpeciesBreed")}
                readOnly
                onClick={() => void openSpeciesBreedPicker()}
                rightSection={<FeatherIcon icon="search" size={16} />}
              />
              <TextInput label={t("common.fields.color")} value={draft.color} onChange={(event) => updateDraft("color", event.currentTarget.value)} />
              <Tooltip {...validationOverlay("weightKg", "left")}>
                <TextInput
                  label={t("common.fields.weightKg")}
                  value={draft.weightKg}
                  inputMode="decimal"
                  placeholder="0,000"
                  onChange={(event) => updateDraft("weightKg", event.currentTarget.value.replace(/[^0-9,.]/g, ""))}
                  {...validationProps("weightKg")}
                  {...focusProps("weightKg")}
                />
              </Tooltip>
            </Stack>
            <AnimalSizeSelector value={draft.size} onChange={(value) => updateDraft("size", value)} t={t} />
            <Group gap="sm" wrap="nowrap" style={{ gridColumn: "1 / -1", width: "100%" }}>
              <Select
                label={t("common.fields.sex")}
                value={draft.sex || null}
                data={[
                  { value: "MALE", label: t("animals.sex.male") },
                  { value: "FEMALE", label: t("animals.sex.female") },
                ]}
                onChange={(value) => updateDraft("sex", value ?? "")}
                clearable
                comboboxProps={{ zIndex: 1300 }}
                style={{ flex: 1, minWidth: 0 }}
              />
              <TextInput
                type="date"
                label={t("common.fields.birthDate")}
                value={draft.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => updateDraft("birthDate", event.currentTarget.value)}
                style={{ flex: 1, minWidth: 0 }}
              />
            </Group>
            <Group align="flex-end" gap="xs" wrap="nowrap" style={{ gridColumn: "1 / -1", width: "100%" }}>
              <FileInput
                label={t("common.fields.picture")}
                placeholder={draft.picture ? t("animals.replaceImage") : t("animals.selectImage")}
                accept="image/*"
                value={imageFile}
                onChange={(file) => { setImageFile(file); setEditorDirty(true); }}
                clearable
                style={{ flex: 1 }}
              />
              {draft.id && draft.picture && (
                <>
                  <Tooltip label={t("animals.viewImage")} position="top" zIndex={1600} withinPortal>
                    <ActionIcon
                      variant="light"
                      color="light.1"
                      size={36}
                      onClick={() => void openImagePreview()}
                      aria-label={t("animals.viewImage")}
                    >
                      <FeatherIcon icon="image" size={18} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={t("animals.deleteImage")} position="top" zIndex={1600} withinPortal>
                    <ActionIcon
                      variant="light"
                      color="red"
                      size={36}
                      loading={imageDeleting}
                      onClick={() => setImageDeleteConfirmOpen(true)}
                      aria-label={t("animals.deleteImage")}
                    >
                      <FeatherIcon icon="trash-2" size={18} />
                    </ActionIcon>
                  </Tooltip>
                </>
              )}
            </Group>
            <Stack gap="xs" style={{ gridColumn: "1 / -1", width: "100%" }}>
              <Text size="sm" fw={500}>{t("animals.conditions")}</Text>
              <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                {conditionImportanceOrder.map((importance) => {
                  const selectedCount = dogConditions.filter((condition) => condition.importance === importance && selectedConditionIndexes.has(condition.index)).length;
                  return (
                    <UnstyledButton
                      key={importance}
                      type="button"
                      onClick={() => openConditionLookup(importance)}
                      aria-haspopup="dialog"
                      style={{
                        width: "100%",
                        minHeight: "var(--kahu-inline-action)",
                        display: "flex",
                        alignItems: "center",
                        padding: "10px 12px",
                        border: "1px solid var(--mantine-color-gray-3)",
                        borderLeft: `4px solid var(--mantine-color-${conditionColors[importance]}-6)`,
                        borderRadius: 4,
                        background: "var(--mantine-color-white)",
                      }}
                    >
                      <Stack gap={2} style={{ minWidth: 0 }}>
                        <Text fw={700} size="sm">{t(`animals.conditions.${importance}` as TranslationKey)}</Text>
                        <Text size="xs" c="dimmed">{t("animals.conditions.selected", { count: String(selectedCount) })}</Text>
                      </Stack>
                    </UnstyledButton>
                  );
                })}
              </div>
            </Stack>
          </SimpleGrid>
          <Textarea label={t("common.fields.description")} value={draft.description} onChange={(event) => updateDraft("description", event.currentTarget.value)} autosize minRows={3} />
          <Group justify="space-between">
            <div>
              {draft.id && (
                <Button
                  variant="light"
                  color="red"
                  leftSection={<FeatherIcon icon="trash-2" size={16} />}
                  onClick={() => {
                    const animal = animals.find((item) => item.id === draft.id);
                    setDeleteTarget(animal ?? {
                      id: draft.id!,
                      primaryTutorId: draft.primaryTutorId,
                      customerId: draft.customerId,
                      name: draft.name,
                      speciesId: draft.speciesId || null,
                      speciesText: draft.speciesText || null,
                      breedId: draft.breedId || null,
                      breedText: draft.breedText || null,
                      color: draft.color || null,
                      sex: draft.sex || null,
                      birthDate: draft.birthDate || null,
                      weightKg: draft.weightKg || null,
                      size: draft.size || null,
                      description: draft.description || null,
                      humanFamily: draft.humanFamily || null,
                      petFamily: draft.petFamily || null,
                      picture: draft.picture || null,
                      conditions: draft.conditions || null,
                    });
                  }}
                >
                  {t("animals.delete")}
                </Button>
              )}
            </div>
            <Group gap="xs">
              <Button variant="subtle" color="light.1" onClick={() => requestDiscard(() => void closeEditor())}>{t("common.actions.cancel")}</Button>
              <Button color="light.1" loading={saving} onClick={() => void saveAnimal()}>{t("common.actions.save")}</Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <SecondaryModal
        opened={expandedConditionGroup !== null}
        onClose={() => setExpandedConditionGroup(null)}
        title={expandedConditionGroup ? t(`animals.conditions.${expandedConditionGroup}` as TranslationKey) : t("animals.conditions")}
        size="lg"
        centered
        zIndex={1550}
      >
        {expandedConditionGroup && (
          <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="sm">
            {dogConditions.filter((condition) => condition.importance === expandedConditionGroup).map((condition) => (
              <Tooltip key={condition.index} label={condition.description} position="top" zIndex={1700} withinPortal multiline maw={360}>
                <Checkbox
                  color={conditionColors[expandedConditionGroup]}
                  label={condition.name}
                  checked={conditionLookupSelection.has(condition.index)}
                  onChange={(event) => toggleConditionLookup(condition.index, event.currentTarget.checked)}
                />
              </Tooltip>
            ))}
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="subtle" color="light.1" onClick={() => setExpandedConditionGroup(null)}>{t("common.actions.cancel")}</Button>
            <Button color="light.1" onClick={confirmConditionLookup}>{t("common.actions.ok")}</Button>
          </Group>
          </Stack>
        )}
      </SecondaryModal>

      <SecondaryModal opened={imageDeleteConfirmOpen} onClose={() => setImageDeleteConfirmOpen(false)} title={t("animals.deleteImageConfirmTitle")} centered zIndex={1500}>
        <Stack>
          <Text>{t("animals.confirmDeleteImage", { name: draft.name || t("animals.unnamed") })}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="light.1" onClick={() => setImageDeleteConfirmOpen(false)} disabled={imageDeleting}>{t("common.actions.cancel")}</Button>
            <Button color="red" loading={imageDeleting} onClick={() => void deleteAnimalImage()}>{t("animals.deleteImage")}</Button>
          </Group>
        </Stack>
      </SecondaryModal>

      <SecondaryModal opened={imagePreviewOpen} onClose={closeImagePreview} title={`${t("animals.imageTitle")} - ${imagePreviewName || draft.name || t("animals.unnamed")}`} size="lg" centered zIndex={1500}>
        <Paper p="sm" radius="sm" withBorder>
          {imagePreviewLoading && <Group justify="center" py="xl"><Loader size="sm" /></Group>}
          {!imagePreviewLoading && imagePreviewUrl && (
            <Image src={imagePreviewUrl} alt={imagePreviewName || draft.name || t("animals.unnamed")} fit="contain" mah="70vh" />
          )}
        </Paper>
      </SecondaryModal>

      <SecondaryModal opened={tutorModalOpen} onClose={() => setTutorModalOpen(false)} title={t("animals.selectTutor")} size="lg" centered zIndex={1400}>
        <Stack>
          <Group align="flex-end">
            <TextInput
              placeholder={t("animals.tutorSearchPlaceholder")}
              value={tutorSearch}
              onChange={(event) => setTutorSearch(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadTutors(tutorSearch);
              }}
              style={{ flex: 1 }}
            />
            <Button color="light.1" onClick={() => void loadTutors(tutorSearch)}>{t("datatable.search.placeholder")}</Button>
          </Group>
          <Stack gap={4} style={{ height: 360, overflowY: "auto" }}>
            {tutorLoading && <Group justify="center" p="lg"><Loader color="light.1" /></Group>}
            {!tutorLoading && tutors.map((tutor) => (
              <Paper key={tutor.id} withBorder radius="sm" p="sm" style={{ cursor: "pointer" }} onClick={() => selectTutor(tutor)}>
                <Text fw={700}>{displayTutor(tutor)}</Text>
                <Text size="xs" c="dimmed">{tutor.phone || tutor.id}</Text>
              </Paper>
            ))}
            {!tutorLoading && !tutors.length && <Text c="dimmed" ta="center" py="md">{t("animals.noTutors")}</Text>}
          </Stack>
        </Stack>
      </SecondaryModal>

      <SecondaryModal opened={speciesBreedModalOpen} onClose={() => setSpeciesBreedModalOpen(false)} title={t("animals.selectSpeciesBreed")} size="lg" centered zIndex={1400}>
        <Stack>
          <Group gap="xs" align="flex-end">
            {speciesBreedLevel === "breeds" && (
              <Button
                variant="subtle"
                color="light.1"
                onClick={() => { setSpeciesBreedLevel("species"); setBreedOptions([]); setBreedOffset(0); setBreedHasMore(false); }}
                px="xs"
              >
                <FeatherIcon icon="arrow-left" size={16} />
              </Button>
            )}
            <TextInput
              placeholder={speciesBreedLevel === "species" ? t("animals.speciesSearchPlaceholder") : t("animals.breedSearchPlaceholder")}
              value={speciesBreedLevel === "species" ? speciesSearch : breedSearch}
              onChange={(event) => {
                if (speciesBreedLevel === "species") setSpeciesSearch(event.currentTarget.value);
                else setBreedSearch(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                if (speciesBreedLevel === "species") void loadSpecies(speciesSearch, false);
                else if (selectedSpecies) void loadBreeds(selectedSpecies.id, breedSearch, false);
              }}
              style={{ flex: 1 }}
            />
            <Button
              color="light.1"
              onClick={() => {
                if (speciesBreedLevel === "species") void loadSpecies(speciesSearch, false);
                else if (selectedSpecies) void loadBreeds(selectedSpecies.id, breedSearch, false);
              }}
            >
              {t("datatable.search.placeholder")}
            </Button>
          </Group>
          <Text size="sm" c="dimmed" style={{ height: 20 }}>
            {speciesBreedLevel === "breeds" && selectedSpecies ? valueOrEmpty(selectedSpecies.commonName) : ""}
          </Text>
          <Stack gap={4} style={{ height: 360, overflowY: "auto" }} onScroll={handleSpeciesBreedScroll}>
            {speciesBreedLevel === "species" && speciesOptions.map((species) => (
              <Paper key={species.id} withBorder radius="sm" p="sm" style={{ cursor: "pointer" }} onClick={() => void selectSpecies(species)}>
                <Text fw={700}>{species.commonName || species.id}</Text>
              </Paper>
            ))}
            {speciesBreedLevel === "breeds" && breedOptions.map((breed) => (
              <Paper key={breed.id} withBorder radius="sm" p="sm" style={{ cursor: "pointer" }} onClick={() => selectBreed(breed)}>
                <Text fw={700}>{breed.commonName || breed.id}</Text>
              </Paper>
            ))}
            {speciesBreedLoading && <Group justify="center" p="md"><Loader color="light.1" size="sm" /></Group>}
            {!speciesBreedLoading && speciesBreedLevel === "species" && !speciesOptions.length && <Text c="dimmed" ta="center" py="md">{t("animals.noSpecies")}</Text>}
            {!speciesBreedLoading && speciesBreedLevel === "breeds" && !breedOptions.length && <Text c="dimmed" ta="center" py="md">{t("animals.noBreeds")}</Text>}
          </Stack>
        </Stack>
      </SecondaryModal>
    </Stack>
  );
}
