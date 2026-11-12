import { describe, expect, it, vi } from "vitest";
import { cleanPetTraits, newPetTraits, nextPetGrowthAt, PET_ADULT_MS, PET_STAGES,
  petAppearance, petGrowth, setPetGrowing, setPetStage } from "./pets";
import { newIsoPlacement, validateIsoLayout } from "./isoRoom";

const start = 1_800_000_000_000;
const baby = { item: "cat", ...newPetTraits(start, () => 0.5) };

describe("individual pet growth", () => {
  it("keeps old pets adult and samples new sizes/forms exactly once", () => {
    expect(petGrowth({ item: "cat" }, start).stage.key).toBe("adult");
    expect(petAppearance({ item: "cat" }, start)).toMatchObject({ scale: 1, bodyWidth: 1, bodyHeight: 1 });
    const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    const traits = newPetTraits(start, random);
    expect(traits).toEqual({ petSize: 0.78, petForm: "round", growth: { ageMs: 0, startedAt: start } });
    expect(random).toHaveBeenCalledTimes(2);
    expect(cleanPetTraits(traits)).toEqual(traits);
    expect(petAppearance(traits, start)).toEqual(petAppearance(traits, start));
  });

  it("crosses exact stage boundaries and catches up after a closed app", () => {
    const teen = PET_STAGES[1].ageMs;
    expect(petGrowth(baby, start + teen - 1).stage.key).toBe("baby");
    expect(petGrowth(baby, start + teen).stage.key).toBe("teen");
    expect(petGrowth(baby, start + PET_ADULT_MS - 1).stage.key).toBe("teen");
    expect(petGrowth(baby, start + PET_ADULT_MS).stage.key).toBe("adult");
    expect(petGrowth(baby, start + PET_ADULT_MS * 10)).toMatchObject({ ageMs: PET_ADULT_MS, growing: false, next: null });
    expect(petGrowth(baby, start - 1000).ageMs).toBe(0);
  });

  it("freezes accumulated age and resumes from that age without charging paused time", () => {
    const elapsed = 20_000;
    const paused = { ...baby, growth: setPetGrowing(baby, false, start + elapsed) };
    expect(petGrowth(paused, start + PET_ADULT_MS)).toMatchObject({ ageMs: elapsed, growing: false });
    const resumed = { ...paused, growth: setPetGrowing(paused, true, start + PET_ADULT_MS) };
    expect(petGrowth(resumed, start + PET_ADULT_MS + 4000).ageMs).toBe(elapsed + 4000);
    expect(petGrowth(baby, start + 4000).ageMs).toBe(4000); // another pet is independent
    expect(setPetStage(paused, "teen", start).startedAt).toBeNull();
  });

  it("retains traits through room validation, while furniture never gains pet identity", () => {
    const placement = { id: "pet", item: "cat", gx: 1, gy: 1, ...baby };
    const layout = validateIsoLayout({ w: 6, d: 6, placements: [placement,
      { ...placement, id: "desk", item: "desk", gx: 3 }] });
    expect(layout.placements[0]).toMatchObject(baby);
    expect(layout.placements[1].growth).toBeUndefined();
    expect(layout.placements[1].petSize).toBeUndefined();
    expect(newIsoPlacement("cat", [], { w: 6, d: 6 }).growth.ageMs).toBe(0);
    expect(newIsoPlacement("desk", [], { w: 6, d: 6 }).growth).toBeUndefined();
  });

  it("rejects malformed traits and schedules only a growing pet's next boundary", () => {
    expect(cleanPetTraits({ petSize: true, petForm: "unknown", growth: { ageMs: -1, startedAt: null } })).toEqual({});
    expect(cleanPetTraits({ growth: { ageMs: 0, startedAt: Infinity } })).toEqual({});
    expect(nextPetGrowthAt([{ item: "cat" }, baby], start)).toBe(start + PET_STAGES[1].ageMs);
    expect(nextPetGrowthAt([{ ...baby, growth: { ageMs: 0, startedAt: null } }], start)).toBe(Infinity);
    expect(petAppearance(baby, start).head).toBeGreaterThan(petAppearance(baby, start + PET_ADULT_MS).head);
  });
});
