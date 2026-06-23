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
};

export const ALGORITHM_KEYS = Object.keys(ALGORITHMS);

export function applyAlgorithm(key, tasks) {
  const algo = ALGORITHMS[key] || ALGORITHMS.custom;
  return algo.sort(tasks);
}
