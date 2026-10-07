// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import ChallengesPanel from "./ChallengesPanel";
import { useChallenges } from "../lib/useChallenges";
import { CHALLENGES_KEY } from "../lib/challenges";
import { removeStored, writeJSON } from "../lib/storage";

let store;
const error = vi.fn();
vi.mock("../store", () => ({ useStore: () => store }));
function Harness() {
  const state = useChallenges(error);
  store = { ...state, addCustomChallenge: (draft) => {
    try { state.addChallenge(draft); return true; }
    catch (err) { error(err.message); return false; }
  } };
  return <ChallengesPanel />;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 7, 12));
  writeJSON(CHALLENGES_KEY, { version: 1, day: "2026-10-07", completed: [] });
  error.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); removeStored(CHALLENGES_KEY); });
function create(title, cadence = "daily", tracking = "manual", target = 1) {
  fireEvent.click(screen.getByRole("tab", { name: "My challenges" }));
  fireEvent.click(screen.getByRole("button", { name: "New challenge" }));
  fireEvent.change(screen.getByLabelText("Your goal"), { target: { value: title } });
  fireEvent.change(screen.getByLabelText("Repeat"), { target: { value: cadence } });
  fireEvent.change(screen.getByLabelText("Track progress"), { target: { value: tracking } });
  fireEvent.change(screen.getByLabelText(/^Target/), { target: { value: String(target) } });
  fireEvent.click(screen.getByRole("button", { name: "Add challenge" }));
}

it("replaces the selected unwanted daily prompt without touching other progress", () => {
  writeJSON(CHALLENGES_KEY, { version: 1, day: "2026-10-07", completed: ["start-study"] });
  render(<Harness />);
  const replace = screen.getByRole("button", { name: "Replace Talk to a friend today" });
  replace.focus();
  fireEvent.click(replace);
  expect(document.activeElement).toBe(replace);
  expect(screen.queryByRole("heading", { name: "Talk to a friend today" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Start a study session" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("1 of 3 completed");
  expect(screen.queryByRole("button", { name: "Replace Start a study session" })).toBeNull();
});

it("creates an ongoing manual goal, advances it, undoes a step and returns keyboard focus", () => {
  render(<Harness />);
  create("Read three chapters", "ongoing", "manual", 3);
  expect(screen.queryByRole("form", { name: "New personal challenge" })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "New challenge" }));
  const row = screen.getByRole("heading", { name: "Read three chapters" }).closest("li");
  expect(row.textContent).toContain("Ongoing");
  fireEvent.click(within(row).getByText("+1 step"));
  fireEvent.click(within(row).getByText("+1 step"));
  fireEvent.click(within(row).getByText("+1 step"));
  expect(within(row).getByText("Goal reached")).toBeTruthy();
  fireEvent.click(within(row).getByRole("button", { name: "Undo one step for Read three chapters" }));
  expect(row.textContent).toContain("2 / 3 steps");
  expect(within(row).queryByText("Goal reached")).toBeNull();
});

it("requires a second tap for resetting and deleting a personal goal", () => {
  render(<Harness />);
  create("Stretch today");
  fireEvent.click(screen.getByText("Mark complete"));
  const reset = screen.getByRole("button", { name: "Reset Stretch today progress" });
  fireEvent.click(reset);
  expect(screen.getByText("Reset?")).toBeTruthy();
  expect(store.challenges.custom[0].progress).toBe(1);
  fireEvent.click(reset);
  expect(store.challenges.custom[0].progress).toBe(0);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "New challenge" }));
  const remove = screen.getByRole("button", { name: "Delete Stretch today" });
  fireEvent.click(remove);
  expect(screen.getByText("sure?")).toBeTruthy();
  expect(store.challenges.custom).toHaveLength(1);
  fireEvent.click(remove);
  expect(store.challenges.custom).toHaveLength(0);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "New challenge" }));
});

it("offers automatic tracking and never advertises manual credit for an automatic goal", () => {
  render(<Harness />);
  create("Finish two tasks", "daily", "task-completed", 2);
  const row = screen.getByRole("heading", { name: "Finish two tasks" }).closest("li");
  expect(row.textContent).toContain("Daily / Tasks completed");
  expect(within(row).queryByText("+1 step")).toBeNull();
  expect(within(row).queryByText("Mark complete")).toBeNull();
});

it("keeps the form and draft after rejected input", () => {
  render(<Harness />);
  create("   ");
  expect(error).toHaveBeenCalledWith(expect.stringContaining("Give your challenge a name"));
  expect(screen.getByLabelText("Your goal").value).toBe("   ");
  expect(store.challenges.custom).toHaveLength(0);
});

it("keeps a personal draft when switching lists and supports keyboard tab navigation", () => {
  render(<Harness />);
  const personal = screen.getByRole("tab", { name: "My challenges" });
  const daily = screen.getByRole("tab", { name: "Daily" });
  fireEvent.keyDown(daily, { key: "ArrowRight" });
  expect(document.activeElement).toBe(personal);
  expect(personal.getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "New challenge" }));
  fireEvent.change(screen.getByLabelText("Your goal"), { target: { value: "Half written goal" } });
  fireEvent.keyDown(personal, { key: "Home" });
  expect(document.activeElement).toBe(daily);
  fireEvent.click(personal);
  expect(screen.getByLabelText("Your goal").value).toBe("Half written goal");
});
