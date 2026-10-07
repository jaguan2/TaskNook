// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Dock from "./Dock";

afterEach(() => cleanup());

it("warms a panel before selecting it", () => {
  const warm = vi.fn();
  const select = vi.fn();
  render(<Dock active={[]} onSelect={select} onWarm={warm} />);
  const room = screen.getByRole("button", { name: "Room" });
  fireEvent.pointerEnter(room);
  expect(warm).toHaveBeenCalledWith("room");
  fireEvent.click(room);
  expect(select).toHaveBeenCalledWith("room");
});

it("opens Challenges and reveals its label on keyboard focus", () => {
  const select = vi.fn();
  render(<Dock active={[]} onSelect={select} />);
  const challenges = screen.getByRole("button", { name: "Challenges" });
  fireEvent.focus(challenges);
  expect(screen.getAllByText("Challenges")).toHaveLength(2);
  fireEvent.click(challenges);
  expect(select).toHaveBeenCalledWith("challenges");
  fireEvent.blur(challenges);
  expect(screen.getAllByText("Challenges")).toHaveLength(1);
});
