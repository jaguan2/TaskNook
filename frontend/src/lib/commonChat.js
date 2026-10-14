import { groupResponders } from "./chat";

export const COMMON_CHAT_MAX_LENGTH = 280;
export const COMMON_CHAT_MAX_MESSAGES = 60;

export function commonChatWelcome(displayName, roomName) {
  const name = String(displayName || "You").trim() || "You";
  const room = String(roomName || "the common room").trim() || "the common room";
  return `Welcome ${name} to ${room}`;
}

export function commonChatPresence(change) {
  const label = change?.person?.label || change?.person?.username;
  if (!label) return null;
  if (change.type === "joined") return `${label} joined the room`;
  if (change.type === "left") return `${label} left the room`;
  return null;
}

export function appendCommonChatMessage(messages, message) {
  return [...messages, message].slice(-COMMON_CHAT_MAX_MESSAGES);
}

/**
 * Pick one present, audible neighbour to answer. The existing group-chat
 * ranking supplies the natural first choice (including focus/break state),
 * while the fallback guarantees a room reply even when everybody is inside a
 * focus block. A common room should occasionally be slow, never feel dead.
 */
export function commonChatResponder(
  occupants,
  text,
  now,
  seed = 0,
  mutedUsernames = new Set()
) {
  const eligible = (occupants || [])
    .filter((person) => person?.username && !mutedUsernames.has(person.username))
    .sort((a, b) => a.username.localeCompare(b.username));
  if (!eligible.length) return null;
  const preferred = groupResponders(
    eligible.map((person) => person.username),
    text,
    now,
    seed
  )[0];
  return eligible.find((person) => person.username === preferred)
    || eligible[Math.abs(seed) % eligible.length];
}

