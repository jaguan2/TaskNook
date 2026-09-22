// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WALL_H } from "../lib/iso";
import PartitionWall, { PARTITION_WALL_H } from "./PartitionWall";

afterEach(cleanup);

const renderPartition = (run, height) =>
  render(
    <svg>
      <PartitionWall run={run} height={height} fill="#8f6874" />
    </svg>,
  );

describe("PartitionWall", () => {
  it("meets the exterior room's roof line by default", () => {
    const { container } = renderPartition({ plane: "gy", at: 2, from: 1, to: 4 });
    const wall = container.querySelector('[data-partition-style="wall"]');

    expect(PARTITION_WALL_H).toBe(WALL_H);
    expect(Number(wall.dataset.wallHeight)).toBe(WALL_H);
  });

  it("keeps an arch human-sized beneath a full-height wall header", () => {
    const { container } = renderPartition(
      { plane: "gy", at: 2, from: 1, to: 4, arch: true },
      WALL_H,
    );
    const arch = container.querySelector('[data-partition-style="arch"]');

    expect(Number(arch.dataset.wallHeight)).toBe(WALL_H);
    expect(Number(arch.dataset.openingHeight)).toBe(72);
    expect(Number(arch.dataset.openingHeight)).toBeLessThan(Number(arch.dataset.wallHeight));
    expect(arch.dataset.archModel).toBe("plaster-surround");
    expect(arch.querySelector('[data-arch-layer="reveal"]')).toBeTruthy();
    expect(arch.querySelector('[data-arch-layer="plaster"]')).toBeTruthy();
    expect(arch.querySelector('[data-arch-layer="inner-bevel"]')).toBeTruthy();
  });

  it("honours the scaled height used by preset thumbnails", () => {
    const { container } = renderPartition(
      { plane: "gx", at: 3, from: 0, to: 2, arch: true },
      100,
    );
    const arch = container.querySelector('[data-partition-style="arch"]');

    expect(Number(arch.dataset.wallHeight)).toBe(100);
    expect(Number(arch.dataset.openingHeight)).toBe(72);
  });

  it("keeps a single-edge arch visibly passable", () => {
    const { container } = renderPartition(
      { plane: "gy", at: 2, from: 1, to: 2, arch: true },
      WALL_H,
    );
    const arch = container.querySelector('[data-partition-style="arch"]');

    expect(Number(arch.dataset.revealWidth)).toBeLessThan(8);
    expect(Number(arch.dataset.plasterWidth)).toBeLessThan(5);
  });

  it("accepts the same daylight lift as the exterior shell", () => {
    const { container } = render(
      <svg>
        <PartitionWall
          run={{ plane: "gy", at: 2, from: 1, to: 2 }}
          fill="#8f6874"
          lift="#ffd0b0"
          liftOpacity={0.2}
        />
      </svg>,
    );

    expect(container.querySelector('[data-partition-lift="true"]')).toBeTruthy();
  });
});
