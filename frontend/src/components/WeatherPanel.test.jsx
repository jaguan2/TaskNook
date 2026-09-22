// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WeatherPanel from "./WeatherPanel";

const mockStore = vi.hoisted(() => ({
  realWeather: { tempF: 77, icon: "☀️", label: "Clear" },
  weatherStatus: "idle",
  weatherError: null,
  weatherLocationLabel: "Gainesville, Florida",
  weatherPlaces: [],
  weatherUnit: "F",
  setWeatherUnit: vi.fn(),
  chooseWeatherPlace: vi.fn(),
  refreshRealWeather: vi.fn(),
  searchWeatherCity: vi.fn(),
  autoMatchWeather: false,
  toggleAutoMatchWeather: vi.fn(),
  autoRandomWeather: false,
  toggleRandomWeather: vi.fn(),
  timeOfDay: "day",
  setTimeOfDay: vi.fn(),
  weatherMode: "off",
  setWeather: vi.fn(),
  weatherPresets: [],
  saveWeatherPreset: vi.fn(),
  applyWeatherPreset: vi.fn(),
  deleteWeatherPreset: vi.fn(),
  renameSavedWeatherPreset: vi.fn(() => true),
  moveSavedWeatherPreset: vi.fn(),
  autoTimeOfDay: false,
  setAutoTimeOfDay: vi.fn(),
}));

vi.mock("../store", () => ({ useStore: () => mockStore }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockStore.weatherUnit = "F";
});

describe("weather temperature units", () => {
  it("switches the saved display preference and renders Celsius readings", () => {
    const { rerender } = render(<WeatherPanel />);
    expect(screen.getByText("77°F")).toBeTruthy();

    fireEvent.click(screen.getByText("°C"));
    expect(mockStore.setWeatherUnit).toHaveBeenCalledWith("C");

    mockStore.weatherUnit = "C";
    rerender(<WeatherPanel />);
    expect(screen.getByText("25°C")).toBeTruthy();
  });
});

describe("saved weather scenes", () => {
  it("only clears a new scene name after a successful save", () => {
    mockStore.saveWeatherPreset.mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<WeatherPanel />);

    const input = screen.getByPlaceholderText("Name this scene…");
    fireEvent.change(input, { target: { value: "Morning" } });
    fireEvent.click(screen.getByText("Save current"));
    expect(input.value).toBe("Morning");

    fireEvent.click(screen.getByText("Save current"));
    expect(input.value).toBe("");
  });

  it("renames and reorders saved scenes", () => {
    mockStore.weatherPresets = [
      { name: "Rainy desk", weatherMode: "rain", timeOfDay: "night" },
      { name: "Snow day", weatherMode: "snow", timeOfDay: "day" },
    ];
    render(<WeatherPanel />);

    fireEvent.click(screen.getByLabelText("Rename Rainy desk"));
    fireEvent.change(screen.getByLabelText("Preset name"), {
      target: { value: "Storm study" },
    });
    fireEvent.click(screen.getByLabelText("Save preset name"));
    expect(mockStore.renameSavedWeatherPreset).toHaveBeenCalledWith(
      "Rainy desk",
      "Storm study"
    );

    fireEvent.click(screen.getByLabelText("Move Rainy desk later"));
    expect(mockStore.moveSavedWeatherPreset).toHaveBeenCalledWith("Rainy desk", 1);
  });
});
