import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentWeather, formatPopulation, searchPlaces } from "./weather";

/** Reply to the next fetch with this JSON body. */
function respond(body, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, json: async () => body }))
  );
}

afterEach(() => vi.unstubAllGlobals());

const place = (over = {}) => ({
  id: 1,
  name: "Gainesville",
  admin1: "Florida",
  country: "United States",
  latitude: 29.65,
  longitude: -82.32,
  population: 141085,
  ...over,
});

describe("searchPlaces", () => {
  it("returns every match so a shared name can be disambiguated", async () => {
    // The whole point: "Gainesville" is in Florida AND Alabama, and the old
    // count=1 call silently picked one with no way to reach the other.
    respond({
      results: [
        place(),
        place({ id: 2, admin1: "Alabama", latitude: 34.0, longitude: -86.0, population: 220 }),
      ],
    });
    const found = await searchPlaces("gainesville");
    expect(found).toHaveLength(2);
    expect(found.map((p) => p.region)).toEqual([
      "Florida, United States",
      "Alabama, United States",
    ]);
  });

  it("asks the API for more than one result", async () => {
    respond({ results: [place()] });
    await searchPlaces("gainesville");
    const url = fetch.mock.calls[0][0];
    expect(url).toContain("count=");
    expect(url).not.toContain("count=1&");
    expect(url).not.toMatch(/count=1$/);
  });

  it("url-encodes names with spaces and accents", async () => {
    respond({ results: [place({ name: "São Paulo" })] });
    await searchPlaces("São Paulo");
    expect(fetch.mock.calls[0][0]).toContain(encodeURIComponent("São Paulo"));
  });

  it("drops duplicate rows — two identical choices help nobody", async () => {
    respond({ results: [place(), place({ id: 9 })] });
    expect(await searchPlaces("gainesville")).toHaveLength(1);
  });

  it("drops rows we couldn't fetch weather for anyway", async () => {
    respond({
      results: [place({ id: 3, latitude: null }), place({ id: 4, longitude: undefined }), place()],
    });
    const found = await searchPlaces("gainesville");
    expect(found).toHaveLength(1);
    expect(found[0].lat).toBe(29.65);
  });

  it("builds a label from whatever fields exist", async () => {
    respond({ results: [place({ admin1: undefined })] });
    const [only] = await searchPlaces("gainesville");
    expect(only.label).toBe("Gainesville, United States");
    expect(only.label).not.toContain("undefined");
  });

  it("survives a response with no results array at all", async () => {
    respond({});
    await expect(searchPlaces("nowhere")).rejects.toThrow(/No place found/);
  });

  it("names the place you searched for when nothing matches", async () => {
    respond({ results: [] });
    await expect(searchPlaces("qqqq")).rejects.toThrow('No place found named "qqqq"');
  });
});

describe("formatPopulation", () => {
  it("shortens the numbers that actually distinguish two towns", () => {
    expect(formatPopulation(141085)).toBe("141k");
    expect(formatPopulation(220)).toBe("220");
    expect(formatPopulation(1_200_000)).toBe("1.2m");
    expect(formatPopulation(12_000_000)).toBe("12m");
  });

  it("shows nothing rather than a zero", () => {
    expect(formatPopulation(0)).toBe("");
    expect(formatPopulation(undefined)).toBe("");
    expect(formatPopulation(NaN)).toBe("");
  });
});

describe("fetchCurrentWeather", () => {
  const forecast = (over = {}) => ({
    current: { temperature_2m: 71.4, weather_code: 0, is_day: 1 },
    daily: { sunrise: [1000], sunset: [2000] },
    ...over,
  });

  it("reads the current conditions", async () => {
    respond(forecast());
    const w = await fetchCurrentWeather(29.65, -82.32);
    expect(w.tempF).toBe(71);
    expect(w.isDay).toBe(true);
    expect(w.mode).toBe("off");
  });

  it("names a clear night a clear night", async () => {
    respond(forecast({ current: { temperature_2m: 50, weather_code: 0, is_day: 0 } }));
    const w = await fetchCurrentWeather(0, 0);
    expect(w.label).toBe("Clear night");
    expect(w.icon).toBe("🌙");
    expect(w.timeOfDay).toBe("night");
  });

  it("doesn't show a sun icon at 2am for 'mostly clear'", async () => {
    // Only code 0 used to get the night treatment.
    respond(forecast({ current: { temperature_2m: 50, weather_code: 1, is_day: 0 } }));
    expect((await fetchCurrentWeather(0, 0)).icon).toBe("🌙");
  });

  it("maps thunderstorms to the storm visual", async () => {
    respond(forecast({ current: { temperature_2m: 60, weather_code: 95, is_day: 1 } }));
    expect((await fetchCurrentWeather(0, 0)).mode).toBe("storm");
  });

  it("explains itself when the payload is missing `current`", async () => {
    respond({ daily: { sunrise: [1], sunset: [2] } });
    await expect(fetchCurrentWeather(0, 0)).rejects.toThrow(/unexpected/);
  });

  it("survives a missing daily block instead of throwing on sunrise[0]", async () => {
    respond({ current: { temperature_2m: 60, weather_code: 3, is_day: 1 } });
    const w = await fetchCurrentWeather(0, 0);
    expect(w.timeOfDay).toBe("day");
  });

  it("reports a null temperature rather than NaN", async () => {
    respond(forecast({ current: { temperature_2m: null, weather_code: 0, is_day: 1 } }));
    expect((await fetchCurrentWeather(0, 0)).tempF).toBeNull();
  });

  it("surfaces the service's own reason on a 400", async () => {
    respond({ reason: "Latitude must be in range" }, false);
    await expect(fetchCurrentWeather(999, 0)).rejects.toThrow("Latitude must be in range");
  });

  it("says it timed out rather than blaming the network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const e = new Error("aborted");
        e.name = "TimeoutError";
        throw e;
      })
    );
    await expect(fetchCurrentWeather(0, 0)).rejects.toThrow(/took too long/);
  });
});
