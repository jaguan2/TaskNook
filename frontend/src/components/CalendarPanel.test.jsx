// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CalendarPanel from "./CalendarPanel";

const mockApi = vi.hoisted(() => ({ sessionDay: vi.fn() }));
const mockStore = vi.hoisted(() => ({
  tasks: [],
  events: [],
  addTask: vi.fn(),
  addEvent: vi.fn(),
  removeEvent: vi.fn(),
  editTask: vi.fn(),
  showToast: vi.fn(),
  sessionDays: {},
}));

vi.mock("../lib/api", () => ({ api: mockApi }));
vi.mock("../store", () => ({ useStore: () => mockStore }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 25, 12));
  mockStore.tasks = [];
  mockStore.events = [];
  mockStore.sessionDays = {};
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("calendar navigation", () => {
  it("returns to today after browsing another month", () => {
    render(<CalendarPanel />);
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("July 2026")).toBeTruthy();

    fireEvent.click(screen.getByText("Today"));
    expect(screen.getByText("August 2026")).toBeTruthy();
    expect(screen.getByLabelText("August 25, 2026")).toBeTruthy();
  });
});

describe("calendar focus journal", () => {
  it("shows a failed history lookup and retries it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockStore.sessionDays = { "2026-08-25": 25 };
    mockApi.sessionDay
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        day: "2026-08-25",
        total: 25,
        entries: [{ taskName: "Plan the garden", minutes: 25, sessions: 1 }],
      });

    render(<CalendarPanel />);
    expect(await screen.findByText("Couldn't load this day's focus.")).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => expect(screen.getByText("Plan the garden")).toBeTruthy());
    expect(mockApi.sessionDay).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("calendar planning", () => {
  it("creates a scheduled task for the selected day", () => {
    render(<CalendarPanel />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Physics 2 exam"), { target: { value: "Physics 2 exam" } });
    fireEvent.click(screen.getByText("Add task"));
    expect(mockStore.addTask).toHaveBeenCalledWith(expect.objectContaining({
      name: "Physics 2 exam", scheduledDate: "2026-08-25",
    }));
  });

  it("shows appointments and confirms their removal", () => {
    mockStore.events = [{ id: 4, title: "Dentist", date: "2026-08-25", startTime: "09:30" }];
    render(<CalendarPanel />);
    expect(screen.getByText("Dentist")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Delete Dentist"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete"));
    expect(mockStore.removeEvent).toHaveBeenCalledWith(4);
  });
});
