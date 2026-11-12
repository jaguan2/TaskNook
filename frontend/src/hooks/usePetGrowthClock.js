import { useEffect, useState } from "react";
import { nextPetGrowthAt } from "../lib/pets";

/** One deadline for the entire room; the open editor can request minute labels. */
export function usePetGrowthClock(pets, resolution = Infinity) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer;
    const check = () => {
      clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      const next = nextPetGrowthAt(pets, current);
      if (!Number.isFinite(next)) return;
      timer = setTimeout(check, Math.min(next - current, resolution, 2_147_483_647));
    };
    const visible = () => { if (!document.hidden) check(); };
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [pets, resolution]);
  return now;
}
