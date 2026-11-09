import { describe, expect, it } from "vitest";
import { COTTAGE_SETTINGS, ITEMS, PRESETS } from "../lib/room";
import {
  ISO_ENVS,
  ISO_ITEM_GROUPS,
  ISO_ITEMS,
  ISO_LIGHTING,
  ISO_PRESETS,
} from "../lib/isoRoom";
import { CATALOGS } from "./catalogs";
import { COMMON_PLACES } from "../lib/commonRooms";
import { ALGORITHM_KEYS } from "../lib/algorithms";
import { CHALLENGE_TRACKING, DAILY_CHALLENGES } from "../lib/challenges";
import en from "./locales/en";
import es from "./locales/es";
import ja from "./locales/ja";
import ko from "./locales/ko";
import zhCN from "./locales/zhCN";
import {
  interpolate,
  formatDuration,
  languageMeta,
  normalizeLanguage,
  resourceLabel,
  supportedLanguageKeys,
  translate,
} from "./index";

const TRANSLATED_LANGUAGES = ["es", "zh-CN", "ja", "ko"];

describe("language resolution", () => {
  it("normalizes regional browser languages and falls back safely", () => {
    expect(normalizeLanguage("es-MX")).toBe("es");
    expect(normalizeLanguage("zh-Hans-US")).toBe("zh-CN");
    expect(normalizeLanguage("ja-JP")).toBe("ja");
    expect(normalizeLanguage("ko-KR")).toBe("ko");
    expect(normalizeLanguage("fr-FR")).toBe("en");
    expect(supportedLanguageKeys()).toEqual(["en", "es", "zh-CN", "ja", "ko"]);
  });

  it("interpolates values and falls back to English copy", () => {
    expect(interpolate("Hello {name}", { name: "Luna" })).toBe("Hello Luna");
    expect(translate("es", "room.plan.tile", { x: 2, y: 4 })).toContain("2");
    expect(translate("es", "missing.key", undefined, "Fallback")).toBe("Fallback");
    expect(languageMeta("zh-Hant").locale).toBe("zh-CN");
  });
});

describe("catalog translation coverage", () => {
  const namespaces = {
    isoItems: Object.keys(ISO_ITEMS),
    isoEnvs: Object.keys(ISO_ENVS),
    isoLighting: Object.keys(ISO_LIGHTING),
    isoPresets: Object.keys(ISO_PRESETS),
    isoGroups: ISO_ITEM_GROUPS.map((group) => group.label),
    cottageItems: Object.keys(ITEMS),
    cottageSettings: Object.keys(COTTAGE_SETTINGS),
    cottagePresets: Object.keys(PRESETS),
    cottageZones: ["wall", "desk", "floor", "ceiling"],
    commonPlaces: Object.keys(COMMON_PLACES),
    commonPlaceDescriptions: Object.keys(COMMON_PLACES),
  };

  for (const language of TRANSLATED_LANGUAGES) {
    it(`${language} names every current catalog resource`, () => {
      for (const [namespace, keys] of Object.entries(namespaces)) {
        for (const key of keys) {
          expect(CATALOGS[language]?.[namespace]?.[key], `${namespace}.${key}`).toBeTruthy();
          expect(resourceLabel(language, namespace, key, "missing")).not.toBe("missing");
        }
      }
    });
  }
});

describe("interface translation coverage", () => {
  const localized = { es, "zh-CN": zhCN, ja, ko };
  const placeholders = (message) => [...String(message).matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
  for (const [language, resource] of Object.entries(localized)) {
    it(`${language} covers every interface key`, () => {
      expect(Object.keys(resource.messages).sort()).toEqual(Object.keys(en.messages).sort());
      for (const [key, englishMessage] of Object.entries(en.messages)) {
        expect(placeholders(resource.messages[key]), key).toEqual(placeholders(englishMessage));
      }
    });
  }
});

describe("primary workflow vocabulary", () => {
  it("formats saved minute counts in the selected language", () => {
    expect(formatDuration("en", 125)).toBe("2 hours 5 min");
    expect(formatDuration("en", 125, { short: true })).toBe("2h 5m");
    expect(formatDuration("es", 125)).toBe("2 horas 5 minutos");
    expect(formatDuration("ja", 125)).toBe("2 時間 5 分");
    expect(formatDuration("ko", 0)).toBe("0분");
  });

  it.each(TRANSLATED_LANGUAGES)("%s covers dynamic task and challenge controls", (language) => {
    const keys = [
      ...ALGORITHM_KEYS.flatMap((key) => [`algo.${key}.label`, `algo.${key}.hint`]),
      ...DAILY_CHALLENGES.flatMap(({ id }) => ["title", "description", "hint"].map((field) => `prompt.${id}.${field}`)),
      ...CHALLENGE_TRACKING.flatMap(({ key, unit }) => [`tracking.${key}`, `challengeUnit.${unit}`]),
    ];
    const messages = { es, "zh-CN": zhCN, ja, ko }[language].messages;
    for (const key of keys) expect(typeof messages[key], key).toBe("string");
  });
});
