// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ExteriorWall from "./ExteriorWall";

afterEach(cleanup);

const renderWall = (run, height = 118) =>
  render(
    <svg>
      <ExteriorWall run={run} height={height} fill="#8f6874" />
    </svg>
  );

describe("ExteriorWall", () => {
  it("keeps an original wall full height", () => {
    const { container } = renderWall({ plane: "gy", at: 0, from: 0, to: 4 });
    expect(container.querySelector('[data-exterior-wall="full"]')).toBeTruthy();
  });

  it("finishes a recessed wall as a low cutaway with two end posts", () => {
    const { container } = renderWall({ plane: "gy", at: 4, from: 10, to: 14 });
    const wall = container.querySelector('[data-exterior-wall="cutaway"]');
    expect(wall).toBeTruthy();
    expect(wall.querySelectorAll('line')).toHaveLength(2);
  });

  it("uses the cutaway treatment for the room-wide low-wall mode", () => {
    const { container } = renderWall({ plane: "gx", at: 0, from: 0, to: 5 }, 30);
    expect(container.querySelector('[data-exterior-wall="cutaway"]')).toBeTruthy();
  });
});
