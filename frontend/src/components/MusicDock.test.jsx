// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// Hoisted so the mock factory below (which runs at import time, before this
// file's own consts are initialised) can close over them.
const { STATION, LIST, store } = vi.hoisted(() => ({
  STATION: { provider: "youtube", id: "dQw4w9WgXcQ", label: "secret cafe r&b" },
  LIST: { provider: "youtube", kind: "playlist", id: "PLwzQP2wCE5w5x", label: "homework music" },
  store: { toggleMusic: vi.fn(), selectStation: vi.fn(), station: null },
}));

vi.mock("../store", () => ({
  useStore: () => ({
    musicOn: true,
    musicStations: [store.station, LIST],
    activeStationKey: `${store.station.provider}:${store.station.kind || ""}:${store.station.id}`,
    selectStation: store.selectStation,
    // Deliberately still offered: the assertion is that MusicDock never calls
    // it. Hiding the bar must not stop the music.
    toggleMusic: store.toggleMusic,
  }),
}));

const { default: MusicDock } = await import("./MusicDock");

// The off-screen 320×180 YouTube player. Parked at left:-9999px, which is the
// only thing that distinguishes it in the DOM — and its survival is the whole
// "the music keeps playing" promise.
const playerHolder = () => document.querySelector("div[style*='-9999px']");
const hideButton = () => screen.getByRole("button", { name: /hide the player/i });

beforeEach(() => {
  store.station = STATION;
  store.toggleMusic.mockClear();
  store.selectStation.mockClear();
  localStorage.clear();
  // Stand in for the IFrame API so no <script> is appended and no 12s
  // load-timeout is left pending. The component only needs it to construct.
  window.YT = {
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 },
    Player: class {
      destroy() {}
    },
  };
});

afterEach(() => {
  cleanup();
  delete window.YT;
});

describe("MusicDock — hiding the bar is not stopping the music", () => {
  it("keeps the SAME player element mounted through a hide", () => {
    // Regression guard: the obvious way to write "hide the bar" is an early
    // `return null` (or moving the holder inside the expanded branch). Either
    // unmounts the player, the effect's cleanup destroys it, and the button
    // labelled "the music keeps playing" silently stops the music.
    render(<MusicDock />);
    const before = playerHolder();
    expect(before).toBeTruthy();

    fireEvent.click(hideButton());

    expect(playerHolder()).toBe(before); // same node — never remounted
    expect(document.contains(before)).toBe(true);
  });

  it("never calls toggleMusic", () => {
    render(<MusicDock />);
    fireEvent.click(hideButton());
    expect(store.toggleMusic).not.toHaveBeenCalled();
  });

  it("collapses to a single pill that brings the bar back", () => {
    render(<MusicDock />);
    const volume = screen.getByRole("slider", { name: /music volume/i });
    const wrapper = () => volume.closest("div.glass").parentElement;
    expect(wrapper().className).not.toMatch(/invisible/);
    expect(screen.queryByRole("button", { name: /show the music player/i })).toBeNull();

    fireEvent.click(hideButton());

    // The transport is HIDDEN, not gone — asserted on the class because jsdom
    // loads no CSS, so nothing here can observe real computed visibility. The
    // browser probe is what measures that; this pins the mechanism, which is
    // the part a refactor would break.
    expect(wrapper().className).toMatch(/invisible/);
    expect(wrapper().className).toMatch(/pointer-events-none/);
    const pill = screen.getByRole("button", { name: /show the music player/i });

    fireEvent.click(pill);
    expect(wrapper().className).not.toMatch(/invisible/);
    expect(screen.queryByRole("button", { name: /show the music player/i })).toBeNull();
  });

  it("keeps a Spotify station's embed — the embed IS its player", () => {
    // The YouTube player lives off-screen, so unmounting the bar would only
    // cost you the controls. Spotify's player is the visible iframe: drop it
    // and "the music keeps playing" becomes a lie.
    store.station = { provider: "spotify", kind: "playlist", id: "37i9dQZF1DX4sWSpwq3LiO" };
    render(<MusicDock />);
    const embed = document.querySelector("iframe[src*='spotify']");
    expect(embed).toBeTruthy();

    fireEvent.click(hideButton());

    expect(document.querySelector("iframe[src*='spotify']")).toBe(embed);
  });

  it("remembers being hidden across a remount", () => {
    render(<MusicDock />);
    fireEvent.click(hideButton());
    cleanup();

    render(<MusicDock />);
    expect(screen.getByRole("button", { name: /show the music player/i })).toBeTruthy();
  });
});

describe("MusicDock — the title links out", () => {
  it("points a single-video station at its watch page, in a new window", () => {
    render(<MusicDock />);
    const link = screen.getByRole("link");

    expect(link.getAttribute("href")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    // `target` is load-bearing, not decoration: pywebview's WebView2 only sends
    // the URL to the system browser via its new-window request. A same-window
    // link would navigate the packaged APP to YouTube, with no back button.
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.textContent).toContain("secret cafe r&b");
  });

  it("falls back to the playlist page until a track is known", () => {
    store.station = LIST;
    render(<MusicDock />);
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "https://www.youtube.com/playlist?list=PLwzQP2wCE5w5x"
    );
  });

  it("has no headphones shortcut left on the bar", () => {
    // Removed as unhelpful (user feedback) — the Sounds panel is a dock click
    // away. Its `onOpenPanel` prop went with it, so App must not pass one.
    render(<MusicDock />);
    expect(screen.queryByRole("button", { name: /sounds panel/i })).toBeNull();
    expect(MusicDock.length).toBe(0); // takes no props at all
  });
});
