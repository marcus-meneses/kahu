/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { defaultLocale, dictionaries, Locale, TranslationKey } from "./dictionaries";

type TranslationValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const localeStorageKey = "kahu.locale";
const localePreferenceVersionKey = "kahu.locale.version";
const localePreferenceVersion = "pt-default-1";

const supportedLocales = Object.keys(dictionaries) as Locale[];

const browserLocale = (): Locale => {
  if (localStorage.getItem(localePreferenceVersionKey) !== localePreferenceVersion) {
    localStorage.setItem(localeStorageKey, "pt-BR");
    localStorage.setItem(localePreferenceVersionKey, localePreferenceVersion);
    return "pt-BR";
  }

  const stored = localStorage.getItem(localeStorageKey) as Locale | null;
  if (stored && supportedLocales.includes(stored)) return stored;

  const navigatorLocale = navigator.language.toLowerCase();
  if (navigatorLocale.startsWith("pt")) return "pt-BR";
  return defaultLocale;
};

const interpolate = (template: string, values?: TranslationValues) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? `{${key}}`));

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localeState, setLocaleState] = useState<Locale>(browserLocale);

  const value = useMemo<I18nContextValue>(() => {
    const setLocale = (nextLocale: Locale) => {
      localStorage.setItem(localeStorageKey, nextLocale);
      setLocaleState(nextLocale);
    };

    const t = (key: TranslationKey, values?: TranslationValues) => {
      const template = dictionaries[localeState][key] ?? dictionaries[defaultLocale][key] ?? key;
      return interpolate(template, values);
    };

    return { locale: localeState, setLocale, t };
  }, [localeState]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
