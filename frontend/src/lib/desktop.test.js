import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasDesktopApi,
  hasDesktopWidgetApi,
  setAlwaysOnTop,
  setDesktopWidgetMode,
} from "./desktop";

const originalWindow = globalThis.window;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

describe("desktop bridge", () => {
  it("degrades cleanly in a normal browser", async () => {
    globalThis.window = {};
    expect(hasDesktopApi()).toBe(false);
    expect(hasDesktopWidgetApi()).toBe(false);
    await expect(setAlwaysOnTop(true)).resolves.toBe(false);
    await expect(setDesktopWidgetMode(true)).resolves.toBe(false);
  });

  it("forwards native pin and widget requests", async () => {
    const setAlways = vi.fn().mockResolvedValue(true);
    const setWidget = vi.fn().mockResolvedValue(true);
    globalThis.window = {
      pywebview: { api: { set_always_on_top: setAlways, set_widget_mode: setWidget } },
    };
    expect(hasDesktopApi()).toBe(true);
    expect(hasDesktopWidgetApi()).toBe(true);
    await expect(setAlwaysOnTop(true)).resolves.toBe(true);
    await expect(setDesktopWidgetMode(true)).resolves.toBe(true);
    expect(setAlways).toHaveBeenCalledWith(true);
    expect(setWidget).toHaveBeenCalledWith(true);
  });

  it("contains a native resize failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    globalThis.window = {
      pywebview: { api: { set_widget_mode: vi.fn().mockRejectedValue(new Error("no GUI")) } },
    };
    await expect(setDesktopWidgetMode(true)).resolves.toBe(false);
    expect(error).toHaveBeenCalledOnce();
  });
});
