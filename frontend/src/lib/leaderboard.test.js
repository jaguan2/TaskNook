import { describe, expect, it } from "vitest";
import {
  buildWeeklyLeaderboard,
  leaderboardDateRange,
  sundayWeekStart,
  weeklyFocusMinutes,
} from "./leaderboard";

describe("weekly friends leaderboard", () => {
  it("starts the week on local Sunday", () => {
    expect(sundayWeekStart(new Date(2026, 9, 14, 18, 30))).toEqual(
      new Date(2026, 9, 11)
    );
    expect(sundayWeekStart(new Date(2026, 9, 11, 23, 59))).toEqual(
      new Date(2026, 9, 11)
    );
  });

  it("keeps both month names when a week crosses a month boundary", () => {
    expect(leaderboardDateRange(new Date(2026, 3, 1, 12))).toBe("Mar 29–Apr 1");
  });

  it("totals saved study time from Sunday through today only", () => {
    const days = {
      "2026-10-10": 999,
      "2026-10-11": 30,
      "2026-10-12": 40,
      "2026-10-14": 20,
      "2026-10-15": 500,
    };

    expect(weeklyFocusMinutes(days, new Date(2026, 9, 14, 18, 30))).toBe(90);
  });

  it("includes the user and ranks every friend by week-to-date minutes", () => {
    const board = buildWeeklyLeaderboard({
      user: { id: 9, username: "you", displayName: "Taylor", avatar: "🌿" },
      friends: [
        { id: 1, username: "luna", displayName: "Luna", avatar: "🌙" },
        { id: 2, username: "kai", displayName: "Kai", avatar: "🌻" },
      ],
      sessionDays: { "2026-10-11": 600 },
      now: new Date(2026, 9, 14, 18, 30),
    });

    expect(board[0]).toMatchObject({ label: "You", minutes: 600, isYou: true });
    expect(board).toHaveLength(3);
    expect(board.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(board.slice(1).map((entry) => entry.username).sort()).toEqual(["kai", "luna"]);
  });

  it("uses a stable name order when totals tie", () => {
    const board = buildWeeklyLeaderboard({
      user: { id: 9, username: "you", displayName: "You" },
      friends: [
        { id: 2, username: "zara", displayName: "Zara" },
        { id: 1, username: "amy", displayName: "Amy" },
      ],
      sessionDays: {},
      now: new Date(2026, 9, 11, 5),
    });

    expect(board.map((entry) => entry.label)).toEqual(["Amy", "You", "Zara"]);
  });
});
