// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LanguageSettings from "../components/settings/LanguageSettings";
import { LANGUAGE_STORAGE_KEY } from "./index";
import { I18nProvider, useI18n } from "./I18nProvider";

function Harness() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span>{t("panel.settings.title")}</span>
      <button onClick={() => setLanguage("ja")}>日本語</button>
    </div>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = "";
  document.documentElement.dir = "";
});

describe("I18nProvider", () => {
  it("switches immediately, updates the document language and persists", () => {
    const view = render(<I18nProvider><Harness /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "日本語" }));

    expect(screen.getByTestId("language").textContent).toBe("ja");
    expect(screen.getByText("設定")).toBeTruthy();
    expect(document.documentElement.lang).toBe("ja-JP");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ja");

    view.unmount();
    render(<I18nProvider><Harness /></I18nProvider>);
    expect(screen.getByTestId("language").textContent).toBe("ja");
  });

  it("exposes the settings choices as one native radio group", () => {
    render(<I18nProvider><LanguageSettings /></I18nProvider>);
    const choices = screen.getAllByRole("radio");
    expect(choices).toHaveLength(5);
    expect(choices.every((choice) => choice.name === "tasknook-language")).toBe(true);

    const japanese = screen.getByRole("radio", { name: "日本語" });
    fireEvent.click(japanese);
    expect(japanese.checked).toBe(true);
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ja");
  });
});
