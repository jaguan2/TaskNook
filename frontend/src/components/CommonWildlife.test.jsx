// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import CommonRoom from "./CommonRoom";
import CommonWildlife from "./CommonWildlife";
import { COMMON_PLACES, createCommonSession } from "../lib/commonRooms";
import { DEFAULT_CHARACTER } from "../lib/profile";

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("paints ducks above water and beneath the bank props, without adding selectable seats", () => {
  const scene = COMMON_PLACES["willow-pond"];
  const { container } = render(<CommonRoom session={createCommonSession(scene.id)} character={DEFAULT_CHARACTER} />);
  const water = container.querySelector('[data-common-prop="pond"]');
  const ducks = container.querySelector('[data-common-wildlife="ducks"]');
  const bank = container.querySelector('[data-common-prop="pond-rock-front"]');
  expect(water.compareDocumentPosition(ducks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(ducks.compareDocumentPosition(bank) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(ducks.getAttribute("pointer-events")).toBe("none");
  expect(ducks.querySelectorAll('[role="button"]')).toHaveLength(0);
  expect(container.querySelectorAll('[data-common-prop="pond"]')).toHaveLength(1);
  expect(container.querySelectorAll('[data-common-person="you"]')).toHaveLength(1);
});

it("uses no JS timers, stays still in reduced motion and pauses its browser routes", () => {
  vi.useFakeTimers();
  const scene = COMMON_PLACES["willow-pond"];
  const props = { wildlife: scene.wildlife, pond: scene.props.find(p => p.id === "pond") };
  const { container, rerender } = render(<svg><CommonWildlife {...props} reduceMotion /></svg>);
  expect(vi.getTimerCount()).toBe(0);
  expect([...container.querySelectorAll('[data-wildlife-route]')].every(node => node.style.animation === "none")).toBe(true);
  rerender(<svg><CommonWildlife {...props} paused /></svg>);
  expect([...container.querySelectorAll('[data-wildlife-route]')].every(node => node.style.animationPlayState === "paused")).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  expect(container.querySelectorAll('.leg-step-a,.leg-step-b')).toHaveLength(0);
});
