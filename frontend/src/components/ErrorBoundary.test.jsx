// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // React logs caught errors itself; the boundary logs too. Neither is a test
  // failure, and both make the output unreadable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function Boom({ throws = true }) {
  if (throws) throw new Error("scene exploded");
  return <p>the room</p>;
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>all fine</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("all fine")).toBeTruthy();
  });

  it("catches a throw instead of unmounting the tree", () => {
    // Without a boundary this is a blank page — and in the packaged .exe
    // (--windowed, no console) a blank page is indistinguishable from an app
    // that never launched.
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something in TaskNook broke/i)).toBeTruthy();
    expect(screen.getByText(/Reload TaskNook/i)).toBeTruthy();
  });

  it("shows the error text for reporting, behind a disclosure", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Technical details/i)).toBeTruthy();
    expect(screen.getByText(/scene exploded/)).toBeTruthy();
  });

  it("uses a custom fallback when one is given", () => {
    // App relies on this for the scene: a room that can't draw must not take
    // the to-do list and the timer with it.
    render(
      <ErrorBoundary fallback={(error) => <p>fallback: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("fallback: scene exploded")).toBeTruthy();
  });

  it("retry re-renders the children", () => {
    function Flaky() {
      return <Boom throws={Flaky.shouldThrow} />;
    }
    Flaky.shouldThrow = true;

    render(
      <ErrorBoundary fallback={(_error, retry) => <button onClick={retry}>Try again</button>}>
        <Flaky />
      </ErrorBoundary>
    );
    expect(screen.getByText("Try again")).toBeTruthy();

    Flaky.shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.getByText("the room")).toBeTruthy();
  });
});
