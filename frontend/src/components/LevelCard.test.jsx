// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import LevelCard from "./LevelCard";
import { normalizeProgression, recordLogin } from "../lib/progression";

afterEach(cleanup);
it("shows level, growing requirement, total XP and an accessible progress bar", () => {
  const progression = { ...recordLogin(normalizeProgression(null)), studyXP: 150 };
  render(<LevelCard progression={progression} />);
  expect(screen.getByRole("heading", { name: "Level 2" })).toBeTruthy();
  expect(screen.getByText("160 total XP")).toBeTruthy();
  expect(screen.getByText("Level 3 in 90 XP")).toBeTruthy();
  const bar = screen.getByRole("progressbar");
  expect(bar.getAttribute("aria-valuenow")).toBe("60");
  expect(bar.getAttribute("aria-valuemax")).toBe("150");
  expect(screen.getByText(/1 day login streak/)).toBeTruthy();
});
it("explains XP eligibility without introducing a claim control", () => {
  render(<LevelCard progression={normalizeProgression(null)} />);
  expect(screen.getByText("How to earn XP")).toBeTruthy();
  expect(screen.getByText(/once per neighbour each day/)).toBeTruthy();
  expect(screen.getByText(/ongoing goals reward once/)).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
