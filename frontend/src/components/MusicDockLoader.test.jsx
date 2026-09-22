// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadYouTubeApi } from "./MusicDock";

const SCRIPT = 'script[src="https://www.youtube.com/iframe_api"]';

afterEach(() => {
  vi.useRealTimers();
  document.querySelector(SCRIPT)?.remove();
  delete window.YT;
  delete window.onYouTubeIframeAPIReady;
});

describe("YouTube API loading", () => {
  it("removes a timed-out script so the next attempt performs a real retry", async () => {
    vi.useFakeTimers();
    const previousReady = vi.fn();
    window.onYouTubeIframeAPIReady = previousReady;

    const first = loadYouTubeApi();
    const firstScript = document.querySelector(SCRIPT);
    expect(firstScript).not.toBeNull();
    await vi.advanceTimersByTimeAsync(12_000);
    await expect(first).resolves.toBeNull();
    expect(document.querySelector(SCRIPT)).toBeNull();
    expect(window.onYouTubeIframeAPIReady).toBe(previousReady);

    const second = loadYouTubeApi();
    const secondScript = document.querySelector(SCRIPT);
    expect(secondScript).not.toBeNull();
    expect(secondScript).not.toBe(firstScript);
    await vi.advanceTimersByTimeAsync(12_000);
    await expect(second).resolves.toBeNull();
  });
});
