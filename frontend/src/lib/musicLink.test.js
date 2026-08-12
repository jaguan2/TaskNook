import { describe, expect, it } from "vitest";
import { resolveMusicLink, stationKey, stationUrl } from "./musicLink";

const VIDEO = { provider: "youtube", id: "dQw4w9WgXcQ", label: "a single" };
const LIST = { provider: "youtube", kind: "playlist", id: "PLwzQP2wCE5w5x", label: "a list" };

describe("stationUrl — the page behind the transport bar's title", () => {
  it("links a single video to its watch page", () => {
    expect(stationUrl(VIDEO)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("deep-links a playlist to the track that's playing, inside the list", () => {
    // The point of passing the current track: a bare `playlist?list=…` opens at
    // track 1, so on hour three of a mix the link answers the wrong question.
    expect(stationUrl(LIST, "dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLwzQP2wCE5w5x"
    );
  });

  it("falls back to the playlist page before a track is known", () => {
    // The cued state right after launch, and the moment a station is switched.
    expect(stationUrl(LIST)).toBe("https://www.youtube.com/playlist?list=PLwzQP2wCE5w5x");
    expect(stationUrl(LIST, "")).toBe("https://www.youtube.com/playlist?list=PLwzQP2wCE5w5x");
  });

  it("ignores a video id that isn't one", () => {
    // getVideoData() is the player's word, not ours — anything but a real id
    // must not be interpolated into a URL we then hand to a browser.
    for (const junk of ["", "  ", "short", "waytoolongtobeanid", "bad id x", "?v=x&t=1"]) {
      expect(stationUrl(LIST, junk)).toBe(
        "https://www.youtube.com/playlist?list=PLwzQP2wCE5w5x"
      );
    }
  });

  it("links every Spotify kind to its open.spotify.com page", () => {
    for (const kind of ["playlist", "album", "track", "show", "episode"]) {
      expect(stationUrl({ provider: "spotify", kind, id: "4rOoJ6Egrf8K2IrywzwOMk" })).toBe(
        `https://open.spotify.com/${kind}/4rOoJ6Egrf8K2IrywzwOMk`
      );
    }
  });

  it("returns null rather than a dead link when there's no page to open", () => {
    // The caller renders plain text on null; a bogus href would look clickable
    // and do nothing.
    expect(stationUrl(null)).toBe(null);
    expect(stationUrl(undefined)).toBe(null);
    expect(stationUrl({ provider: "youtube" })).toBe(null);
    expect(stationUrl({ provider: "spotify", id: "abc" })).toBe(null); // no kind
    expect(stationUrl({ provider: "soundcloud", id: "abc" })).toBe(null);
  });

  it("round-trips a pasted link back to the same URL", () => {
    // resolveMusicLink → stationUrl should return you to where you started,
    // which is the whole promise of a clickable title on a custom station.
    const pasted = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    expect(stationUrl(resolveMusicLink(pasted))).toBe(pasted);

    const list = resolveMusicLink("https://www.youtube.com/playlist?list=PLwzQP2wCE5w5x");
    expect(stationUrl(list)).toBe("https://www.youtube.com/playlist?list=PLwzQP2wCE5w5x");
    expect(stationKey(list)).toBe("youtube:playlist:PLwzQP2wCE5w5x");
  });
});
