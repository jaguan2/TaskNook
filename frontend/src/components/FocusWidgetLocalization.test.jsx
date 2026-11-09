// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../i18n/I18nProvider";
import { removeStored, writeStored } from "../services/storage";
import FocusWidget from "./FocusWidget";

afterEach(() => { cleanup(); removeStored("tasknook.language"); });

function Harness() {
  const [running, setRunning] = useState(false);
  return <FocusWidget clock="15:00" task="My 日本語 notes" progress={0.5}
    round={1} rounds={4} today={30} goal={60} running={running} canFinish
    onToggle={() => setRunning((value) => !value)} />;
}

describe("translated widget controls", () => {
  it.each([
    ["es", "Continuar", "Pausar", "50% de la sesión completado", "30 / 60 min hoy"],
    ["zh-CN", "继续", "暂停", "本轮已完成50%", "今日30/60分钟"],
    ["ja", "再開", "一時停止", "セッションの50%完了", "今日30/60分"],
    ["ko", "계속", "일시 정지", "세션 50% 완료", "오늘 30 / 60분"],
  ])("renders %s playback and progress without changing the task name", (language, resume, pause, progress, today) => {
    writeStored("tasknook.language", language);
    render(<I18nProvider><Harness /></I18nProvider>);
    expect(screen.getByText("My 日本語 notes").textContent).toBe("My 日本語 notes");
    expect(screen.getByRole("img", { name: progress }).getAttribute("aria-label")).toBe(progress);
    expect(screen.getByText(today).textContent).toBe(today);
    fireEvent.click(screen.getByRole("button", { name: resume }));
    expect(screen.getByRole("button", { name: pause }).textContent).toBe(pause);
  });
});
