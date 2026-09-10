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
  editTask: vi.fn(),
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

describe("task naming and deletion", () => {
  it("renames a task in place and confirms deletion in a dialog", () => {
    render(<TaskPanel />);
    fireEvent.click(screen.getByLabelText("Rename First task"));
    const input = screen.getByLabelText("Task name");
    fireEvent.change(input, { target: { value: "Renamed task" } });
    fireEvent.blur(input);
    expect(mockStore.editTask).toHaveBeenCalledWith(1, { name: "Renamed task" });

    fireEvent.click(screen.getAllByLabelText("Delete task")[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getAllByLabelText("Delete task")[0]);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockStore.removeTask).toHaveBeenCalledWith(1);
  });
});
