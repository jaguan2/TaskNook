import { describe, expect, it } from "vitest";
import {
  VISIT_ACCESS,
  NPC_HOME_KEYS,
  deriveNpcCharacter,
  resolveVisitRoom,
} from "./visiting";
import { ISO_PRESETS, footOf, footprintFree, seatFor, validateIsoLayout } from "./isoRoom";
import { validateCharacter } from "./profile";

const BOTS = ["luna", "kai", "sora", "mochi"];
const bot = (username) => ({
  id: BOTS.indexOf(username) + 1,
  username,
  displayName: username[0].toUpperCase() + username.slice(1),
  room: null,
  character: null,
});
const GUEST = { character: validateCharacter(null), name: "Jason" };

// The synthetic ids are unique per friend (wander offsets key off them);
// tests find them by prefix rather than pinning the exact suffix.
const ownerOf = (layout) => layout.placements.find((p) => p.id.startsWith("visit-owner"));
const guestOf = (layout) => layout.placements.find((p) => p.id.startsWith("visit-guest"));

describe("the door vocabulary", () => {
  it("matches the backend whitelist exactly", () => {
    // VISIT_ACCESS_LEVELS in app.py — the both-languages contract. If this
    // fails, one side gained (or renamed) a door state the other can't speak.
    expect(VISIT_ACCESS.map((v) => v.key)).toEqual([
      "public",
      "friends",
      "invite",
      "private",
    ]);
  });

  it("every bot's home is a real preset", () => {
    for (const name of BOTS) {
      expect(ISO_PRESETS[NPC_HOME_KEYS[name]], name).toBeTruthy();
    }
  });
});

describe("deriveNpcCharacter", () => {
  it("is deterministic and survives validation unchanged", () => {
    for (const name of BOTS) {
      const c = deriveNpcCharacter(name);
      expect(deriveNpcCharacter(name)).toEqual(c);
      expect(validateCharacter(c)).toEqual(c);
    }
  });

  it("gives the four bots visibly different looks", () => {
    // "Different" = differing in at least one high-visibility trait; four
    // identical neighbours would defeat the point of deriving at all.
    const looks = BOTS.map((n) => deriveNpcCharacter(n));
    for (let a = 0; a < looks.length; a++) {
      for (let b = a + 1; b < looks.length; b++) {
        const differs =
          looks[a].model !== looks[b].model ||
          looks[a].hair !== looks[b].hair ||
          looks[a].outfit !== looks[b].outfit ||
          looks[a].hairColor !== looks[b].hairColor;
        expect(differs, `${BOTS[a]} vs ${BOTS[b]}`).toBe(true);
      }
    }
  });
});

describe("resolveVisitRoom", () => {
  it("derives every bot's home with owner and guest standing on real floor", () => {
    for (const name of BOTS) {
      const { layout, personas } = resolveVisitRoom(bot(name), GUEST);
      const owner = ownerOf(layout);
      const guest = guestOf(layout);
      expect(owner, name).toBeTruthy();
      expect(guest, name).toBeTruthy();
      for (const p of [owner, guest]) {
        expect(footprintFree(p.gx, p.gy, footOf("resident", 0), layout), name).toBe(true);
      }
      expect(personas[owner.id].label).toBe(bot(name).displayName);
      expect(personas[guest.id].label).toBe("Jason");
      // Every persona entry points at a placement that actually exists.
      for (const id of Object.keys(personas)) {
        expect(layout.placements.some((p) => p.id === id), `${name}/${id}`).toBe(true);
      }
    }
  });

  it("synthetic ids differ per friend, so wander offsets can't leak between visits", () => {
    // The scene instance survives a visit-to-visit swap and its roam offsets
    // key off placement ids — a reused id would carry luna's offset into
    // kai's room and stand him off his own floor.
    expect(ownerOf(resolveVisitRoom(bot("luna"), null).layout).id).not.toBe(
      ownerOf(resolveVisitRoom(bot("kai"), null).layout).id
    );
  });

  it("seats the owners whose homes kept a seat for them", () => {
    // The NPC pass emptied these seats ON PURPOSE (the owner's chair is
    // yours when it's your room, theirs when it's theirs): luna's desk
    // chair, kai's writing desk, sora's pond bench. Mochi hosts standing.
    const seated = { luna: true, kai: true, sora: true, mochi: false };
    for (const name of BOTS) {
      const { layout } = resolveVisitRoom(bot(name), null);
      const seat = seatFor(ownerOf(layout), layout.placements);
      expect(!!seat, name).toBe(seated[name]);
    }
  });

  it("a stored room always beats the derived home — including an empty one", () => {
    const stored = {
      w: 5,
      d: 4,
      placements: [{ id: "a1", item: "cafetable", gx: 2, gy: 2 }],
    };
    const { layout } = resolveVisitRoom({ ...bot("luna"), room: stored }, null);
    expect(layout.w).toBe(5);
    expect(layout.d).toBe(4);
    expect(layout.placements.some((p) => p.item === "cafetable")).toBe(true);

    // `[]` is a room someone cleared on purpose — same rule as the room
    // reconcile: only null (never saved) may be substituted with a preset.
    const emptied = resolveVisitRoom(
      { ...bot("luna"), room: { w: 6, d: 5, placements: [] } },
      null
    ).layout;
    expect(emptied.w).toBe(6);
    expect(emptied.placements.filter((p) => p.item !== "resident")).toEqual([]);
  });

  it("a stored `you` marks the owner's chosen spot and never wears the guest's face", () => {
    // In THEIR room, their `you` IS them: it becomes the owner's resident at
    // the same spot — self semantics (your character, your thought bubble)
    // stay in your own room.
    const stored = {
      w: 6,
      d: 5,
      placements: [{ id: "me1", item: "you", gx: 3, gy: 2.5 }],
    };
    const { layout } = resolveVisitRoom({ ...bot("luna"), room: stored }, null);
    expect(layout.placements.some((p) => p.item === "you")).toBe(false);
    const owner = ownerOf(layout);
    expect(owner.gx).toBe(3);
    expect(owner.gy).toBe(2.5);
  });

  it("a stored placement squatting on a synthetic id is dropped, not dressed as the owner", () => {
    const luna = bot("luna");
    const squatterId = `visit-owner-${luna.id}`;
    const stored = {
      w: 6,
      d: 5,
      placements: [{ id: squatterId, item: "cafetable", gx: 1, gy: 1 }],
    };
    const { layout, personas } = resolveVisitRoom({ ...luna, room: stored }, null);
    // Exactly one placement carries the id, and it's the inserted resident.
    const claimants = layout.placements.filter((p) => p.id === squatterId);
    expect(claimants.length).toBe(1);
    expect(claimants[0].item).toBe("resident");
    expect(personas[squatterId].label).toBe("Luna");
  });

  it("a stored character always beats the derived one", () => {
    const styled = { ...bot("luna"), character: { hair: "braids", outfit: "#c4767f" } };
    const { layout, personas } = resolveVisitRoom(styled, null);
    const owner = ownerOf(layout);
    expect(personas[owner.id].character.hair).toBe("braids");
    expect(personas[owner.id].character.outfit).toBe("#c4767f");
  });

  it("the visit never mutates the preset it was derived from", () => {
    const before = JSON.stringify(ISO_PRESETS[NPC_HOME_KEYS.luna]);
    resolveVisitRoom(bot("luna"), GUEST);
    expect(JSON.stringify(ISO_PRESETS[NPC_HOME_KEYS.luna])).toBe(before);
  });

  it("the resolved layout is itself valid", () => {
    // Belt-and-braces: the layout goes straight to IsoRoom, which assumes
    // validator invariants (half-snapping, ids, bounds).
    const { layout } = resolveVisitRoom(bot("sora"), GUEST);
    const revalidated = validateIsoLayout(layout);
    expect(revalidated.placements.length).toBe(layout.placements.length);
  });
});
