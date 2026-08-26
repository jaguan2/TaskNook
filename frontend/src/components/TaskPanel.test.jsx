// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TaskPanel from "./TaskPanel";

const mockStore = vi.hoisted(() => ({
  orderedTasks: [
    { id: 1, name: "First task", duration: 25, priority: "medium", completed: false },
    { id: 2, name: "Second task", duration: 25, priority: "low", completed: false, dueDate: "2026-09-01" },
  ],
  algorithm: "custom",
  chooseAlgorithm: vi.fn(),
  addTask: vi.fn(),
  toggleTask: vi.fn(),
  removeTask: vi.fn(),
  reorderTasks: vi.fn(),
  activeTaskId: null,
  setActiveTaskId: vi.fn(),
  stats: { completion: 0, tasksDone: 0, tasksTotal: 2, tasksDoneToday: 0 },
  sessionDays: {},
  dailyGoal: 120,
  setDailyGoal: vi.fn(),
}));

vi.mock("../store", () => ({ useStore: () => mockStore }));
vi.mock("../timer", () => ({
  useTimer: () => ({
    focusMinutesLive: 0,
    breakNudge: true,
    setBreakNudge: vi.fn(),
    breakNudgeMinutes: 120,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("manual task ordering", () => {
  it("offers keyboard-accessible move controls", () => {
    render(<TaskPanel />);
    expect(screen.getByTitle("Due 2026-09-01")).toBeTruthy();
    expect(screen.getByLabelText("Move First task up").disabled).toBe(true);
    expect(screen.getByLabelText("Move Second task down").disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Move First task down"));
    expect(mockStore.reorderTasks).toHaveBeenCalledWith([
      mockStore.orderedTasks[1],
      mockStore.orderedTasks[0],
    ]);
  });
});
