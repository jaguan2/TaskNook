import { describe, expect, it } from "vitest";
import { isTypingTarget } from "./typing";

const el = (tagName, extra = {}) => ({ tagName, ...extra });

describe("isTypingTarget", () => {
  it("covers every field a keystroke belongs to", () => {
    // SELECT and contentEditable are the two the iso room's delete shortcut used
    // to miss, so Backspace deleted furniture while you were using a dropdown.
    for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(isTypingTarget(el(tag))).toBe(true);
    }
    expect(isTypingTarget(el("DIV", { isContentEditable: true }))).toBe(true);
  });

  it("lets shortcuts through everywhere else", () => {
    for (const tag of ["DIV", "BUTTON", "SVG", "BODY", "G"]) {
      expect(isTypingTarget(el(tag))).toBe(false);
    }
    expect(isTypingTarget(el("DIV", { isContentEditable: false }))).toBe(false);
  });

  it("survives a missing or odd target", () => {
    // Keyboard events from a detached node, or a synthetic one in a test.
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
    expect(isTypingTarget({})).toBe(false);
  });
});
