import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER, validateCharacter } from "./profile";
import {
  CHARACTER_PRESETS,
  characterFromPreset,
  characterPresetMatches,
} from "./characterPresets";

describe("character presets", () => {
  it("ships the eight requested, uniquely named starting looks", () => {
    expect(CHARACTER_PRESETS).toHaveLength(8);
    expect(new Set(CHARACTER_PRESETS.map((preset) => preset.key)).size).toBe(8);
    expect(CHARACTER_PRESETS.map((preset) => preset.label)).toEqual([
      "Fall style girl",
      "Fall style guy",
      "School girl",
      "School boy",
      "Office wear female",
      "Office wear male",
      "Lofi girl",
      "Cozy gamer",
    ]);
  });

  it("stores complete, validator-safe character snapshots", () => {
    const fields = Object.keys(DEFAULT_CHARACTER).sort();
    for (const preset of CHARACTER_PRESETS) {
      expect(Object.keys(preset.character).sort(), preset.key).toEqual(fields);
      expect(validateCharacter(preset.character), preset.key).toEqual(preset.character);
      expect(preset.tagline, preset.key).toBeTruthy();
    }
  });

  it("matches only an unchanged preset and stops after a refinement", () => {
    const preset = CHARACTER_PRESETS[0];
    expect(characterPresetMatches(preset.character, preset)).toBe(true);
    // Skin is identity, not styling: every tone still counts as this look.
    expect(characterPresetMatches({ ...preset.character, skin: "#8d5524" }, preset)).toBe(true);
    expect(
      characterPresetMatches({ ...preset.character, hairColor: "#3a3142" }, preset)
    ).toBe(false);
    expect(characterPresetMatches(preset.character, null)).toBe(false);
  });

  it("applies every look with the user's existing skin tone", () => {
    for (const preset of CHARACTER_PRESETS) {
      const applied = characterFromPreset(preset, "#8d5524");
      expect(applied.skin, preset.key).toBe("#8d5524");
      expect(characterPresetMatches(applied, preset), preset.key).toBe(true);
    }
    expect(characterFromPreset(null, "#8d5524")).toBeNull();
  });

  it("does not leak accessories when switching between looks", () => {
    const lofi = CHARACTER_PRESETS.find((preset) => preset.key === "lofi-girl");
    const office = CHARACTER_PRESETS.find((preset) => preset.key === "office-male");
    expect(lofi.character.hat).toBe("headphones");
    expect(office.character.hat).toBe("none");
    expect(office.character.scarf).toBe("none");
    expect(office.character.print).toBe("none");
  });
});
