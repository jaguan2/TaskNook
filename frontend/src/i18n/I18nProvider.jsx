import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readStored, writeStored } from "../services/storage";
import {
  DEFAULT_LANGUAGE,
  formatDuration as durationLabel,
  LANGUAGE_STORAGE_KEY,
  languageMeta,
  normalizeLanguage,
  resourceLabel,
  translate,
} from "./index";

const fallbackMeta = languageMeta(DEFAULT_LANGUAGE);
const fallbackValue = {
  language: DEFAULT_LANGUAGE,
  locale: fallbackMeta.locale,
  direction: fallbackMeta.direction,
  setLanguage: () => {},
  t: (key, values, fallback) => translate(DEFAULT_LANGUAGE, key, values, fallback),
  label: (namespace, key, fallback) => resourceLabel(DEFAULT_LANGUAGE, namespace, key, fallback),
  formatNumber: (value, options) => new Intl.NumberFormat(fallbackMeta.locale, options).format(value),
  formatDate: (value, options) => new Intl.DateTimeFormat(fallbackMeta.locale, options).format(new Date(value)),
  formatList: (values, options) => new Intl.ListFormat(fallbackMeta.locale, options).format(values),
  formatDuration: (minutes, options) => durationLabel(DEFAULT_LANGUAGE, minutes, options),
};

// English is a safe standalone default for component tests and previews. The
// production root still owns the real provider and persistence.
const I18nContext = createContext(fallbackValue);

function initialLanguage() {
  const saved = readStored(LANGUAGE_STORAGE_KEY);
  if (saved) return normalizeLanguage(saved);
  try {
    return normalizeLanguage(navigator.languages?.[0] || navigator.language);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(initialLanguage);
  const meta = languageMeta(language);

  const setLanguage = useCallback((value) => {
    const next = normalizeLanguage(value);
    setLanguageState(next);
    writeStored(LANGUAGE_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = meta.locale;
    root.dir = meta.direction;
  }, [meta.direction, meta.locale]);

  const t = useCallback(
    (key, values, fallback) => translate(language, key, values, fallback),
    [language]
  );
  const label = useCallback(
    (namespace, key, fallback) => resourceLabel(language, namespace, key, fallback),
    [language]
  );
  const formatNumber = useCallback(
    (value, options) => new Intl.NumberFormat(meta.locale, options).format(value),
    [meta.locale]
  );
  const formatDate = useCallback(
    (value, options) => new Intl.DateTimeFormat(meta.locale, options).format(new Date(value)),
    [meta.locale]
  );
  const formatList = useCallback(
    (values, options) => new Intl.ListFormat(meta.locale, options).format(values),
    [meta.locale]
  );
  const formatDuration = useCallback(
    (minutes, options) => durationLabel(language, minutes, options),
    [language]
  );

  const value = useMemo(() => ({
    language,
    locale: meta.locale,
    direction: meta.direction,
    setLanguage,
    t,
    label,
    formatNumber,
    formatDate,
    formatList,
    formatDuration,
  }), [language, meta.locale, meta.direction, setLanguage, t, label, formatNumber, formatDate, formatList, formatDuration]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
