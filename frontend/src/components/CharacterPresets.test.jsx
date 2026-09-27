// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CharacterPresets from "./CharacterPresets";
import { CHARACTER_PRESETS, characterFromPreset } from "../lib/characterPresets";

afterEach(cleanup);

describe("CharacterPresets", () => {
  it("offers every authored look and applies the complete snapshot", () => {
    const onPick = vi.fn();
    const current = { ...CHARACTER_PRESETS[0].character, skin: "#8d5524" };
    render(<CharacterPresets character={current} onPick={onPick} />);

    expect(screen.getAllByRole("button")).toHaveLength(CHARACTER_PRESETS.length);
    fireEvent.click(screen.getByRole("button", { name: /School boy/i }));
    expect(onPick).toHaveBeenCalledWith(
      characterFromPreset(
        CHARACTER_PRESETS.find((preset) => preset.key === "school-boy"),
        current.skin
      )
    );
    expect(onPick.mock.calls[0][0].skin).toBe(current.skin);
  });

  it("marks only the exact look as currently worn", () => {
    const active = CHARACTER_PRESETS.find((preset) => preset.key === "cozy-gamer");
    render(<CharacterPresets character={active.character} onPick={() => {}} />);

    expect(screen.getByRole("button", { name: /Cozy gamer/i }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(screen.getByRole("button", { name: /Lofi girl/i }).getAttribute("aria-pressed")).toBe(
      "false"
    );
  });
});
