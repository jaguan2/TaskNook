// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TaskPanel from "./TaskPanel";
import { I18nProvider } from "../i18n/I18nProvider";
import LanguageSettings from "./settings/LanguageSettings";
import { removeStored, writeStored } from "../services/storage";

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

vi.mock("../store", () => ({ useTaskStore: () => mockStore }));
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
  removeStored("tasknook.language");
});

describe("translated task workflow", () => {
  it.each([
    ["es", "¿Qué necesitas hacer?", "+ Añadir tarea", "Meta diaria"],
    ["zh-CN", "需要做什么？", "+ 添加任务", "每日目标"],
    ["ja", "何をする？", "+ タスクを追加", "毎日の目標"],
    ["ko", "무엇을 해야 하나요?", "+ 할 일 추가", "일일 목표"],
  ])("renders and saves tasks in %s without translating user content", async (language, placeholder, add, goal) => {
    writeStored("tasknook.language", language);
    render(<I18nProvider><TaskPanel /></I18nProvider>);
    expect(screen.getByText(goal).textContent).toContain(goal);
    expect(screen.getByText("First task").textContent).toBe("First task");
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: "My 日本語 notes" } });
    fireEvent.click(screen.getByRole("button", { name: add }));
    expect(mockStore.addTask).toHaveBeenCalledWith({
      name: "My 日本語 notes", duration: 25, priority: "medium", dueDate: null,
    });
  });

  it("switches language without losing the task draft and translates deletion controls", () => {
    writeStored("tasknook.language", "en");
    render(<I18nProvider><LanguageSettings /><TaskPanel /></I18nProvider>);
    fireEvent.change(screen.getByPlaceholderText("What needs doing?"), { target: { value: "Keep my draft" } });
    fireEvent.click(screen.getByRole("radio", { name: "Español" }));
    expect(screen.getByPlaceholderText("¿Qué necesitas hacer?").value).toBe("Keep my draft");
    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar tarea" })[0]);
    expect(screen.getByRole("dialog").textContent).toContain("¿Eliminar tarea?");
    expect(screen.getByRole("dialog").textContent).toContain("First task");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByPlaceholderText("¿Qué necesitas hacer?").value).toBe("Keep my draft");
  });
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
