// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HudTasks from "./HudTasks";
import { toISO } from "../lib/dates";

const mockStore = vi.hoisted(() => ({
  orderedTasks: [],
  toggleTask: vi.fn(),
  addTask: vi.fn(),
  removeTask: vi.fn(),
  reorderTasks: vi.fn(),
  activeTaskId: null,
  setActiveTaskId: vi.fn(),
  taskGroups: [],
  addTaskGroup: vi.fn(),
  removeTaskGroup: vi.fn(),
  renameTaskGroup: vi.fn(async () => true),
  toggleRoutine: vi.fn(),
  editTask: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../store", () => ({ useStore: () => mockStore }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockStore.orderedTasks = [];
  mockStore.taskGroups = [];
});

const task = {
  id: 7,
  name: "Plan the garden",
  duration: 25,
  priority: "medium",
  scheduledDate: "2026-08-28",
  dueDate: null,
  notes: "",
  completed: false,
  routine: false,
  group: null,
};

describe("task detail editing", () => {
  it("does not style a task due today as overdue", () => {
    const today = toISO(new Date());
    mockStore.orderedTasks = [{ ...task, dueDate: today }];
    render(<HudTasks onOpenTasks={() => {}} />);

    const badge = screen.getByTitle(`Due ${today}`);
    expect(badge.className).not.toContain("text-danger");
  });

  it("shows a planned date directly on the task row", () => {
    mockStore.orderedTasks = [task];
    render(<HudTasks onOpenTasks={() => {}} />);
    expect(screen.getByTitle("Planned for 2026-08-28").textContent).toContain("08-28");
  });

  it("edits estimate, priority, and scheduled date after creation", () => {
    mockStore.orderedTasks = [task];
    render(<HudTasks onOpenTasks={() => {}} />);
    fireEvent.click(screen.getByLabelText("Edit task details"));

    const estimate = screen.getByLabelText("Estimated minutes");
    fireEvent.change(estimate, { target: { value: "50" } });
    fireEvent.blur(estimate);
    fireEvent.change(screen.getByLabelText("Task priority"), { target: { value: "high" } });
    fireEvent.change(screen.getByLabelText("Scheduled date"), {
      target: { value: "2026-08-30" },
    });

    expect(mockStore.editTask).toHaveBeenCalledWith(7, { duration: 50 });
    expect(mockStore.editTask).toHaveBeenCalledWith(7, { priority: "high" });
    expect(mockStore.editTask).toHaveBeenCalledWith(7, { scheduledDate: "2026-08-30" });
  });
});

describe("task groups", () => {
  it("renames a group in place", async () => {
    mockStore.taskGroups = ["Work"];
    mockStore.orderedTasks = [{ ...task, group: "Work" }];
    render(<HudTasks onOpenTasks={() => {}} />);

    fireEvent.click(screen.getByLabelText("Rename Work group"));
    const input = screen.getByLabelText("Task group name");
    fireEvent.change(input, { target: { value: "Deep work" } });
    fireEvent.blur(input);

    expect(mockStore.renameTaskGroup).toHaveBeenCalledWith("Work", "Deep work");
  });
});
