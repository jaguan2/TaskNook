import { describe, expect, it } from "vitest";
import {
  OPTION_LABEL,
  botReply,
  breakNudgeLine,
  chatTitle,
  dailyCheckIn,
  dialogueOptions,
  replyToOption,
  whenLabel,
} from "../lib/chat";
import { dialoguePack } from "./dialogue";

const LANGUAGES = ["es", "zh-CN", "ja", "ko"];
const NOW = new Date(2026, 10, 3, 14, 0).getTime();

describe("localized NPC dialogue", () => {
  for (const language of LANGUAGES) {
    it(`${language} localizes menus, replies, check-ins, nudges and relative time`, () => {
      const pack = dialoguePack(language);
      expect(Object.keys(pack.options).sort()).toEqual(Object.keys(OPTION_LABEL).sort());

      const options = dialogueOptions("luna", NOW, { language });
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) expect(option.label).toBe(pack.options[option.id]);

      expect(replyToOption("luna", "study", NOW, 1, 1, language)).toBeTruthy();
      expect(botReply("luna", pack.options.greet, NOW, 1, 1, language)).toBeTruthy();
      expect(dailyCheckIn(["luna"], "2026-11-03", language).text).toBeTruthy();
      expect(breakNudgeLine("luna", "90 min", 1, language)).toContain("90 min");
      expect(chatTitle({ members: [] }, 1, language)).toBe(pack.justYou);
      expect(whenLabel(new Date(NOW - 1000).toISOString(), NOW, language)).toBe(pack.now);
      expect(whenLabel(new Date(NOW - 26 * 3600000).toISOString(), NOW, language)).toBe(pack.yesterday);
    });
  }
});
