// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FriendsLeaderboard from "./FriendsLeaderboard";

afterEach(cleanup);

describe("FriendsLeaderboard", () => {
  it("shows the Sunday-start range and the ranked weekly totals", () => {
    render(
      <FriendsLeaderboard
        user={{ id: 9, username: "you", displayName: "Taylor", avatar: "🌿" }}
        friends={[{ id: 1, username: "luna", displayName: "Luna", avatar: "🌙" }]}
        sessionDays={{ "2026-10-11": 600, "2026-10-12": 35 }}
        now={new Date(2026, 9, 14, 18, 30)}
      />
    );

    expect(screen.getByRole("heading", { name: "Weekly study" })).toBeTruthy();
    expect(screen.getByText(/Oct 11–14/)).toBeTruthy();
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("You")).toBeTruthy();
    expect(within(rows[0]).getByText("10h 35m")).toBeTruthy();
    expect(within(rows[0]).getByText("1")).toBeTruthy();
  });

  it("uses a warm empty-week message instead of an empty ranking", () => {
    render(
      <FriendsLeaderboard
        user={{ id: 9, username: "you", displayName: "Taylor" }}
        friends={[]}
        sessionDays={{}}
        now={new Date(2026, 9, 11, 5)}
      />
    );

    expect(screen.getByText("A fresh week — start the first study session.")).toBeTruthy();
  });
});
