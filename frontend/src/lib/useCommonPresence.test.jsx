// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMMON_PRESENCE_MIN_MS } from "./commonPresence";
import { useCommonPresence } from "./useCommonPresence";

let presence;
const showToast = vi.fn();

function Reader() {
  presence = useCommonPresence(showToast);
  return null;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  showToast.mockReset();
});

describe("useCommonPresence", () => {
  it("updates the pre-join roster and open room from one scheduled population", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T12:00:00-04:00"));
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Reader />);

    act(() => presence.enterCommonPresence("common-cottage"));
    const guestSeat = presence.commonRoom.guestSeatId;
    expect(presence.commonRoom.occupants).toHaveLength(3);

    act(() => vi.advanceTimersByTime(COMMON_PRESENCE_MIN_MS));

    expect(presence.commonPresence["common-cottage"].occupants).toHaveLength(2);
    expect(presence.commonRoom.occupants).toHaveLength(2);
    expect(presence.commonRoom.guestSeatId).toBe(guestSeat);
    expect(presence.commonRoom.occupants.map((person) => person.seatId))
      .not.toContain(guestSeat);
    expect(showToast).toHaveBeenCalledWith("Kai headed home");
  });

  it("keeps room actions inert when there is no active common visit", () => {
    render(<Reader />);
    expect(presence.chooseCommonPresenceSeat("window-left")).toBeNull();
    expect(presence.enterCommonPresence("missing")).toBeNull();
    act(() => presence.leaveCommonPresence());
    expect(presence.commonRoom).toBeNull();
  });
});
