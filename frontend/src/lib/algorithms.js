// Task-ordering algorithms. Each takes an array of tasks and returns a NEW
// ordered array (incomplete tasks first, completed tasks always sink to the
// bottom so the focus list stays clean).

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };

function splitDone(tasks) {
  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);
  return { active, done };
}

// Alternate short / long to balance momentum and deep work.
function alternate(active) {
  const byDuration = [...active].sort((a, b) => a.duration - b.duration);
  const result = [];
  let lo = 0;
  let hi = byDuration.length - 1;
  let takeShort = true;
  while (lo <= hi) {
    if (takeShort) result.push(byDuration[lo++]);
    else result.push(byDuration[hi--]);
    takeShort = !takeShort;
  }
  return result;
}

export const ALGORITHMS = {
  custom: {
    label: "My order",
    hint: "Drag to arrange tasks exactly how you like.",
    icon: "✋",
    sort: (tasks) => {
      const { active, done } = splitDone(tasks);
      return [
        ...[...active].sort((a, b) => a.position - b.position),
        ...done,
      ];
    },
  },
  shortest: {
    label: "Quick wins first",
    hint: "Shortest tasks first — build momentum fast.",
    icon: "⚡",
    sort: (tasks) => {
      const { active, done } = splitDone(tasks);
      return [...active.sort((a, b) => a.duration - b.duration), ...done];
    },
  },
  longest: {
    label: "Deep work first",
    hint: "Tackle the big rocks while your energy is high.",
    icon: "⛰️",
    sort: (tasks) => {
      const { active, done } = splitDone(tasks);
      return [...active.sort((a, b) => b.duration - a.duration), ...done];
    },
  },
  alternate: {
    label: "Ebb & flow",
    hint: "Alternate short and long tasks to pace yourself.",
    icon: "🌊",
    sort: (tasks) => {
      const { active, done } = splitDone(tasks);
      return [...alternate(active), ...done];
    },
  },
  priority: {
    label: "Priority",
    hint: "High-priority tasks rise to the top.",
    icon: "🔥",
    sort: (tasks) => {
      const { active, done } = splitDone(tasks);
      return [
        ...active.sort(
          (a, b) =>
            PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
            a.duration - b.duration
        ),
        ...done,
      ];
    },
  },
  random: {
    label: "Random",
    hint: "Shuffled — click again for a new shuffle.",
    icon: "🎲",
    // Needs an explicit shuffled order (see store.jsx's shuffleRandom): the
    // list re-renders far more often than the user clicks (e.g. every timer
    // tick), so sorting with Math.random() here would reshuffle constantly
    // instead of only when asked.
    sort: (tasks, { randomOrder = [] } = {}) => {
      const { active, done } = splitDone(tasks);
      // MAX_SAFE_INTEGER, not Infinity, for ids missing from the shuffle
      // (added since the last click): two of them would compare
      // `Infinity - Infinity` → NaN, an inconsistent comparator. V8 happens
      // to treat NaN as "equal" and leave them put, but that's luck, not a
      // guarantee — a finite sentinel makes "unranked sinks, stably" real.
      // Built ONCE, not per comparison: `indexOf` is a linear scan, and a
      // comparator runs O(n log n) times, so this was O(n² log n) on a value
      // recomputed on every render (including every timer tick).
      const rank = new Map(randomOrder.map((id, i) => [id, i]));
      const at = (t) => rank.get(t.id) ?? Number.MAX_SAFE_INTEGER;
      return [...active.sort((a, b) => at(a) - at(b)), ...done];
    },
  },
};

export const ALGORITHM_KEYS = Object.keys(ALGORITHMS);

export function applyAlgorithm(key, tasks, context) {
  const algo = ALGORITHMS[key] || ALGORITHMS.custom;
  return algo.sort(tasks, context);
}

export function shuffledIds(tasks) {
  const ids = tasks.filter((t) => !t.completed).map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
