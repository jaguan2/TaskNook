import { afterEach, describe, expect, it, vi } from "vitest";
import { botReply, replyToOption } from "./chat";

const activity = vi.hoisted(() => ({ state: "focus", minutesLeft: 23 }));
vi.mock("./visiting", () => ({ npcActivity: () => activity }));
const now = new Date(2026, 10, 3, 14, 0).getTime();
afterEach(() => { activity.state = "focus"; activity.minutesLeft = 23; });

describe("shared NPC activity policy", () => {
  it.each([
    ["es", "hola", "Sigo con mapas estelares. Hablamos en 23 min 📖"],
    ["zh-CN", "你好", "我在做星图，23 分钟后聊 📖"],
    ["ja", "こんにちは", "星図をしているよ。23分後に話そう 📖"],
    ["ko", "안녕", "별자리 지도 하는 중이야. 23분 뒤에 이야기하자 📖"],
  ])("keeps %s menu and typed greetings behind the focus reply", (language, greeting, expected) => {
    expect(replyToOption("luna", "greet", now, 1, 1, language)).toBe(expected);
    expect(botReply("luna", greeting, now, 1, 1, language)).toContain("23");
    expect(replyToOption("luna", "joke", now, 1, 1, language)).toContain("23");
    expect(replyToOption("luna", "thanks", now, 1, 1, language)).toContain("23");
    activity.state = "break";
    expect(replyToOption("luna", "greet", now, 1, 1, language)).not.toContain("23");
  });

  it.each([
    ["focus", "Estoy con mapas estelares; quedan 23 min 📖"],
    ["break", "Descanso de mapas estelares, entre bloques ☕"],
    ["idle", "Esta noche estoy con mapas estelares ✨"],
  ])("answers working questions with the current %s activity", (state, expected) => {
    activity.state = state;
    expect(replyToOption("luna", "working", now, 1, 1, "es")).toBe(expected);
    expect(botReply("luna", "¿Qué estás estudiando?", now, 1, 1, "es")).toBe(expected);
  });

  it("still responds to requests for encouragement during focus", () => {
    expect(replyToOption("luna", "encourage", now, 3, 1, "es"))
      .toBe("En los días difíciles, los pasos pequeños valen el doble 💛");
  });
});
