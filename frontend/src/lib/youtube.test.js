import { describe, it, expect } from "vitest";
import { extractYouTubeId, extractYouTubePlaylist } from "./youtube";
import { resolveMusicLink } from "./musicLink";

const PLAYLIST = "PLwzQP2wCE5w5_L9yjomQyX2CMFa0T-pw_";

describe("extractYouTubeId", () => {
  it("reads the id from a standard watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=jfKfPfyJRdk")).toBe(
      "jfKfPfyJRdk"
    );
  });

  // The shape you get from YouTube's "share" button on a mix: the RD… list is
  // an auto-generated radio playlist that won't load in an iframe embed, so we
  // deliberately keep the video id and drop the list.
  it("keeps the video id from a radio-mix URL and ignores the RD list", () => {
    expect(
      extractYouTubeId(
        "https://www.youtube.com/watch?v=foEjHAkrIDA&list=RDfoEjHAkrIDA&start_radio=1"
      )
    ).toBe("foEjHAkrIDA");
    expect(
      extractYouTubeId(
        "https://www.youtube.com/watch?v=mWI10M1M7JM&list=RDmWI10M1M7JM&start_radio=1"
      )
    ).toBe("mWI10M1M7JM");
  });

  it("handles short, embed, live and shorts links", () => {
    expect(extractYouTubeId("https://youtu.be/jfKfPfyJRdk?t=42")).toBe("jfKfPfyJRdk");
    expect(extractYouTubeId("https://www.youtube.com/embed/jfKfPfyJRdk")).toBe(
      "jfKfPfyJRdk"
    );
    expect(extractYouTubeId("https://www.youtube.com/live/jfKfPfyJRdk")).toBe(
      "jfKfPfyJRdk"
    );
    expect(extractYouTubeId("https://www.youtube.com/shorts/jfKfPfyJRdk")).toBe(
      "jfKfPfyJRdk"
    );
  });

  it("accepts a bare 11-character id", () => {
    expect(extractYouTubeId("jfKfPfyJRdk")).toBe("jfKfPfyJRdk");
  });

  it("returns null for things that aren't YouTube links", () => {
    for (const input of ["", null, undefined, "not a url", "https://example.com"]) {
      expect(extractYouTubeId(input)).toBeNull();
    }
  });
});

describe("extractYouTubePlaylist", () => {
  it("reads the id from a playlist URL", () => {
    expect(
      extractYouTubePlaylist(`https://www.youtube.com/playlist?list=${PLAYLIST}`)
    ).toBe(PLAYLIST);
  });

  it("reads it from a watch URL that also carries a playlist", () => {
    expect(
      extractYouTubePlaylist(`https://www.youtube.com/watch?v=jfKfPfyJRdk&list=${PLAYLIST}`)
    ).toBe(PLAYLIST);
  });

  // RD… lists are auto-generated radio mixes; YouTube refuses to embed them,
  // so we must NOT treat them as playlists.
  it("rejects RD radio mixes", () => {
    expect(
      extractYouTubePlaylist(
        "https://www.youtube.com/watch?v=foEjHAkrIDA&list=RDfoEjHAkrIDA&start_radio=1"
      )
    ).toBeNull();
  });

  it("returns null when there's no list at all", () => {
    expect(extractYouTubePlaylist("https://www.youtube.com/watch?v=jfKfPfyJRdk")).toBeNull();
    expect(extractYouTubePlaylist("")).toBeNull();
  });
});

describe("resolveMusicLink (YouTube)", () => {
  it("prefers a real playlist over the video it was opened at", () => {
    expect(
      resolveMusicLink(`https://www.youtube.com/watch?v=jfKfPfyJRdk&list=${PLAYLIST}`)
    ).toEqual({ provider: "youtube", kind: "playlist", id: PLAYLIST });
  });

  it("falls back to the video for a radio-mix link", () => {
    expect(
      resolveMusicLink(
        "https://www.youtube.com/watch?v=mWI10M1M7JM&list=RDmWI10M1M7JM&start_radio=1"
      )
    ).toEqual({ provider: "youtube", id: "mWI10M1M7JM" });
  });

  it("resolves a plain playlist link (this used to return null)", () => {
    expect(resolveMusicLink(`https://www.youtube.com/playlist?list=${PLAYLIST}`)).toEqual(
      { provider: "youtube", kind: "playlist", id: PLAYLIST }
    );
  });
});
