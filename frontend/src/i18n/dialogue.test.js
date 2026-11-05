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
import {
  dialoguePack,
  localizedFollowup,
  localizedOptionLabel,
} from "./dialogue";

const LANGUAGES = ["es", "zh-CN", "ja", "ko"];
const NOW = new Date(2026, 10, 3, 14, 0).getTime();
const TYPED_INTENTS = {
  es: { working: "¿Qué estás estudiando?", onlong: "¿Cuánto tiempo te quedas?", tea: "¿Qué té preparaste?", tea_share: "Guarda una taza de té para mí", celebrate: "¡Terminé mi ensayo!" },
  "zh-CN": { working: "你在学什么？", onlong: "你还要多久？", tea: "你泡了什么茶？", tea_share: "给我留一杯茶", celebrate: "我写完了作业！" },
  ja: { working: "何を勉強してる？", onlong: "いつまで勉強する？", tea: "何のお茶を入れた？", tea_share: "お茶を一杯残して", celebrate: "課題が終わった！" },
  ko: { working: "뭐 공부하고 있어?", onlong: "언제까지 공부할 거야?", tea: "무슨 차를 만들었어?", tea_share: "차 한 잔 남겨 줘", celebrate: "과제를 끝냈어!" },
};

describe("localized NPC dialogue", () => {
  for (const language of LANGUAGES) {
    it(`${language} localizes menus, replies, check-ins, nudges and relative time`, () => {
      const pack = dialoguePack(language);
      expect(Object.keys(pack.options).sort()).toEqual(Object.keys(OPTION_LABEL).sort());

      const options = dialogueOptions("luna", NOW, { language });
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(option.label).toBe(
          localizedOptionLabel(language, option.id, OPTION_LABEL[option.id], "luna")
        );
      }

      expect(replyToOption("luna", "study", NOW, 1, 1, language)).toBeTruthy();
      expect(botReply("luna", pack.options.greet, NOW, 1, 1, language)).toBeTruthy();
      expect(dailyCheckIn(["luna"], "2026-11-03", language).text).toBeTruthy();
      expect(breakNudgeLine("luna", "90 min", 1, language)).toContain("90 min");
      expect(chatTitle({ members: [] }, 1, language)).toBe(pack.justYou);
      expect(whenLabel(new Date(NOW - 1000).toISOString(), NOW, language)).toBe(pack.now);
      expect(whenLabel(new Date(NOW - 26 * 3600000).toISOString(), NOW, language)).toBe(pack.yesterday);
    });

    it(`${language} keeps all four residents recognisably different`, () => {
      const names = ["luna", "kai", "sora", "mochi"];
      const prompts = names.map((name) =>
        localizedOptionLabel(language, "study", OPTION_LABEL.study, name)
      );
      const replies = names.map((name) =>
        replyToOption(name, "study", NOW, 2, 1, language)
      );
      const checkins = names.map((name) =>
        dailyCheckIn([name], "2026-11-03", language).text
      );

      expect(new Set(prompts).size).toBe(names.length);
      expect(new Set(replies).size).toBe(names.length);
      expect(new Set(checkins).size).toBe(names.length);
      expect(replyToOption("luna", "study", NOW, 2, 1, language)).toBe(replies[0]);

      for (const name of names) {
        const working = replyToOption(name, "working", NOW, 3, 1, language);
        const workFollowup = dialogueOptions(name, NOW, {
          language, theirTurn: true, lastMessage: working,
        }).map(({ id }) => id);
        expect(workFollowup, `${language}/${name}: ${working}`).toContain("celebrate");

        const encouragement = replyToOption(name, "encourage", NOW, 3, 1, language);
        const encouragementFollowup = dialogueOptions(name, NOW, {
          language, theirTurn: true, lastMessage: encouragement,
        }).map(({ id }) => id);
        expect(encouragementFollowup, `${language}/${name}: ${encouragement}`).toContain("joke");
      }
    });

    it(`${language} routes natural typed questions to the same authored answers`, () => {
      for (const [option, text] of Object.entries(TYPED_INTENTS[language])) {
        expect(botReply("luna", text, NOW, 7, 1, language), `${option}: ${text}`).toBe(
          replyToOption("luna", option, NOW, 7, 1, language)
        );
      }
    });
  }

  it("recognises translated NPC replies when building the next menu", () => {
    expect(localizedFollowup("es", "Estoy preparando té de jazmín.")).toBe("tea-detail");
    expect(localizedFollowup("zh-CN", "先休息一下，慢慢来。")).toBe("encourage");
    expect(localizedFollowup("ja", "この章とノートを進めているよ。")).toBe("topic");
    expect(localizedFollowup("ko", "프로젝트 노트를 정리 중이야.")).toBe("topic");
  });
});
