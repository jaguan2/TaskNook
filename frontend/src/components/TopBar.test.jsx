// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TopBar from "./TopBar";

const mockStore = vi.hoisted(() => ({
  user: { avatar: "🌙", displayName: "You" },
  weatherMode: "off",
  setWeather: vi.fn(),
  widgetMode: false,
  setWidgetMode: vi.fn(),
  showToast: vi.fn(),
}));
const desktop = vi.hoisted(() => ({ setAlwaysOnTop: vi.fn() }));
const storage = vi.hoisted(() => ({ writeStored: vi.fn() }));

vi.mock("../store", () => ({ useStore: () => mockStore }));
vi.mock("../lib/storage", () => ({
  readStored: () => null,
  writeStored: storage.writeStored,
}));
vi.mock("../lib/desktop", () => ({
  hasDesktopApi: () => true,
  onDesktopApiReady: () => () => {},
  setAlwaysOnTop: desktop.setAlwaysOnTop,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Always On Top", () => {
  it("keeps the control off and reports a rejected native change", async () => {
    desktop.setAlwaysOnTop.mockResolvedValue(false);
    render(<TopBar />);

    const pin = screen.getByLabelText("Always On Top");
    fireEvent.click(pin);

    await waitFor(() => expect(mockStore.showToast).toHaveBeenCalledOnce());
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    expect(storage.writeStored).not.toHaveBeenCalled();
  });

  it("can turn an enabled native pin back off", async () => {
    desktop.setAlwaysOnTop.mockResolvedValue(true);
    storage.writeStored.mockClear();
    render(<TopBar />);

    const pin = screen.getByLabelText("Always On Top");
    fireEvent.click(pin);
    await waitFor(() => expect(pin.getAttribute("aria-pressed")).toBe("true"));
    fireEvent.click(pin);

    await waitFor(() => expect(pin.getAttribute("aria-pressed")).toBe("false"));
    expect(desktop.setAlwaysOnTop).toHaveBeenNthCalledWith(1, true);
    expect(desktop.setAlwaysOnTop).toHaveBeenNthCalledWith(2, false);
    expect(storage.writeStored).toHaveBeenLastCalledWith("tasknook.alwaysOnTop", "0");
  });
});
