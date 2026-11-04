import en from "./locales/en";
import es from "./locales/es";
import ja from "./locales/ja";
import ko from "./locales/ko";
import zhCN from "./locales/zhCN";
import { CATALOGS } from "./catalogs";

export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "tasknook.language";

export const LANGUAGES = [
  { key: "en", locale: "en-US", label: "English", direction: "ltr" },
  { key: "es", locale: "es-ES", label: "Español", direction: "ltr" },
  { key: "zh-CN", locale: "zh-CN", label: "简体中文", direction: "ltr" },
  { key: "ja", locale: "ja-JP", label: "日本語", direction: "ltr" },
  { key: "ko", locale: "ko-KR", label: "한국어", direction: "ltr" },
];

const RESOURCES = { en, es, "zh-CN": zhCN, ja, ko };

export function normalizeLanguage(value) {
  const raw = String(value || "").trim();
  if (RESOURCES[raw]) return raw;
  const lower = raw.toLowerCase();
  if (lower.startsWith("zh")) return "zh-CN";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("en")) return "en";
  return DEFAULT_LANGUAGE;
}

export function languageMeta(language) {
  const key = normalizeLanguage(language);
  return LANGUAGES.find((entry) => entry.key === key) || LANGUAGES[0];
}

export function interpolate(message, values = {}) {
  return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    values[key] === undefined || values[key] === null ? match : String(values[key])
  );
}

export function translate(language, key, values, fallback = key) {
  const normalized = normalizeLanguage(language);
  const message = RESOURCES[normalized]?.messages?.[key]
    ?? RESOURCES[DEFAULT_LANGUAGE]?.messages?.[key]
    ?? fallback;
  return interpolate(message, values);
}

export function resourceLabel(language, namespace, key, fallback = key) {
  const normalized = normalizeLanguage(language);
  return CATALOGS[normalized]?.[namespace]?.[key]
    ?? RESOURCES[normalized]?.[namespace]?.[key]
    ?? CATALOGS[DEFAULT_LANGUAGE]?.[namespace]?.[key]
    ?? RESOURCES[DEFAULT_LANGUAGE]?.[namespace]?.[key]
    ?? fallback;
}

export function supportedLanguageKeys() {
  return LANGUAGES.map((entry) => entry.key);
}
