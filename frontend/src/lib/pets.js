// Growth is elapsed real time, independent of a room's animation or focus timer.
export const PET_FORMS = [
  { key: "natural", label: "Natural" },
  { key: "slender", label: "Slender" },
  { key: "round", label: "Round" },
];
export const PET_STAGES = [
  { key: "baby", label: "Baby", ageMs: 0, scale: 0.58, head: 1.22 },
  { key: "teen", label: "Teen", ageMs: 2 * 86_400_000, scale: 0.82, head: 1.08 },
  { key: "adult", label: "Adult", ageMs: 7 * 86_400_000, scale: 1, head: 1 },
];
export const PET_ADULT_MS = PET_STAGES[2].ageMs;
const MAX_AGE_MS = 31 * 86_400_000;
const MAX_TIME = 8_640_000_000_000_000;
const validTime = (v) => Number.isSafeInteger(v) && v >= 0 && v <= MAX_TIME;

export function cleanPetTraits(pet) {
  const out = {};
  if (typeof pet.petSize === "number" && Number.isFinite(pet.petSize) && pet.petSize >= 0.75 && pet.petSize <= 1) {
    out.petSize = pet.petSize;
  }
  if (PET_FORMS.some(({ key }) => key === pet.petForm)) out.petForm = pet.petForm;
  const growth = pet.growth;
  if (growth && typeof growth === "object" && !Array.isArray(growth) &&
    Number.isSafeInteger(growth.ageMs) && growth.ageMs >= 0 && growth.ageMs <= MAX_AGE_MS &&
    (growth.startedAt === null || validTime(growth.startedAt))) {
    out.growth = { ageMs: growth.ageMs, startedAt: growth.startedAt };
  }
  return out;
}

/** Randomness is sampled only at adoption, never validation or rendering. */
export function newPetTraits(now = Date.now(), random = Math.random) {
  const roll = () => Math.max(0, Math.min(0.999999, Number(random()) || 0));
  return {
    petSize: Math.round((0.78 + roll() * 0.22) * 100) / 100,
    petForm: PET_FORMS[Math.floor(roll() * PET_FORMS.length)].key,
    growth: { ageMs: 0, startedAt: now },
  };
}

export function petGrowth(pet, now = Date.now()) {
  const growth = cleanPetTraits(pet).growth;
  // Saves predating growth are established adult pets, not newborns.
  const ageMs = growth ? Math.min(PET_ADULT_MS,
    growth.ageMs + (growth.startedAt === null ? 0 : Math.max(0, now - growth.startedAt))) : PET_ADULT_MS;
  const stage = [...PET_STAGES].reverse().find((s) => ageMs >= s.ageMs);
  const next = PET_STAGES[PET_STAGES.indexOf(stage) + 1] || null;
  const growing = !!growth && growth.startedAt !== null && !!next;
  return { ageMs, stage, next, growing, remainingMs: next ? next.ageMs - ageMs : 0 };
}

export function setPetGrowing(pet, growing, now = Date.now()) {
  return { ageMs: petGrowth(pet, now).ageMs, startedAt: growing ? now : null };
}

export function setPetStage(pet, key, now = Date.now()) {
  const stage = PET_STAGES.find((s) => s.key === key);
  if (!stage) return cleanPetTraits(pet).growth;
  return { ageMs: stage.ageMs, startedAt: pet.growth?.startedAt === null ? null : now };
}

export function petAppearance(pet = {}, now = Date.now()) {
  const traits = cleanPetTraits(pet);
  const { stage } = petGrowth(pet, now);
  const scale = (traits.petSize || 1) * stage.scale;
  const form = traits.petForm || "natural";
  return { stage: stage.key, head: stage.head, form, scale,
    bodyWidth: form === "slender" ? 0.88 : form === "round" ? 1.08 : 1,
    bodyHeight: form === "round" ? 1.08 : 1 };
}

export function nextPetGrowthAt(pets, now = Date.now()) {
  let next = Infinity;
  for (const pet of pets) {
    const growth = petGrowth(pet, now);
    if (growth.growing) next = Math.min(next, now + growth.remainingMs);
  }
  return next;
}

export function growthTimeLabel(ms) {
  const hours = Math.max(1, Math.ceil(ms / 3_600_000));
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
