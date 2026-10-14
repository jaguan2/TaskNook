import { describe, expect, it } from "vitest";
import {
  COMMON_CHAT_MAX_MESSAGES,
  appendCommonChatMessage,
  commonChatPresence,
  commonChatResponder,
  commonChatWelcome,
} from "./commonChat";

const occupants = [
  { username: "luna", label: "Luna" },
  { username: "kai", label: "Kai" },
];

describe("common-room chat model", () => {
  it("writes room-specific welcome and presence lines", () => {
    expect(commonChatWelcome("Mina", "Common Cottage"))
      .toBe("Welcome Mina to Common Cottage");
    expect(commonChatPresence({ type: "joined", person: occupants[0] }))
      .toBe("Luna joined the room");
    expect(commonChatPresence({ type: "left", person: occupants[1] }))
      .toBe("Kai left the room");
  });

  it("never selects a muted or absent neighbour", () => {
    const responder = commonChatResponder(
      occupants,
      "hello",
      new Date("2026-10-13T12:00:00"),
      2,
      new Set(["luna"])
    );
    expect(responder).toEqual(occupants[1]);
    expect(commonChatResponder([], "hello", Date.now())).toBeNull();
  });

  it("keeps only the bounded recent room history", () => {
    let messages = [];
    for (let id = 0; id < COMMON_CHAT_MAX_MESSAGES + 4; id += 1) {
      messages = appendCommonChatMessage(messages, { id });
    }
    expect(messages).toHaveLength(COMMON_CHAT_MAX_MESSAGES);
    expect(messages[0].id).toBe(4);
  });
});

