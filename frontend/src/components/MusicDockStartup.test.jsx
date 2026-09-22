// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { player, station } = vi.hoisted(() => ({
  player: vi.fn(),
  station: {
    provider: "youtube",
    id: "dQw4w9WgXcQ",
    label: "saved focus station",
  },
}));

vi.mock("../store", () => ({
  useStore: () => ({
    musicOn: true,
    musicStations: [station],
    activeStationKey: `youtube::${station.id}`,
    selectStation: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.YT;
  vi.resetModules();
  player.mockReset();
});

it("does not start YouTube during app boot and initializes it on the first Play click", async () => {
  // These are the exact persisted values that used to create an iframe on
  // every launch merely to CUE a paused track.
  localStorage.setItem("tasknook.music.on", "1");
  localStorage.setItem("tasknook.autoResumeMusic", "1");
  localStorage.setItem(
    "tasknook.music.resume",
    JSON.stringify({
      key: `youtube::${station.id}`,
      t: 42,
      d: 180,
      title: "saved focus station",
      vid: station.id,
    })
  );
  window.YT = {
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 },
    Player: player,
  };

  const { default: MusicDock } = await import("./MusicDock");
  render(<MusicDock />);

  expect(player).not.toHaveBeenCalled();
  expect(document.querySelector("iframe[src*='youtube']")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /load player/i }));

  await waitFor(() => expect(player).toHaveBeenCalledTimes(1));
});
