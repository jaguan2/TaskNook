// Small per-store channel. Pending replies are observable without polling
// transcripts or putting a countdown in React Context.
export function createChatSignals() {
  const listeners = new Map();
  const pending = new Map();
  const snapshot = (chatId, messagesChanged = false) => ({
    messagesChanged,
    pending: [...new Map([...pending.values()]
      .filter((reply) => reply.chatId === chatId)
      .map((reply) => [reply.username, reply])).values()],
  });
  const publish = (chatId, messagesChanged = true) => {
    const event = snapshot(chatId, messagesChanged);
    listeners.get(chatId)?.forEach((listener) => listener(event));
  };
  return {
    subscribe(chatId, listener) {
      const set = listeners.get(chatId) || new Set();
      set.add(listener);
      listeners.set(chatId, set);
      listener(snapshot(chatId));
      return () => {
        set.delete(listener);
        if (!set.size) listeners.delete(chatId);
      };
    },
    publish,
    start(chatId, token, friend) {
      pending.set(token, { chatId, username: friend.username, displayName: friend.displayName || friend.username });
      publish(chatId, false);
    },
    finish(token) {
      const reply = pending.get(token);
      if (!reply) return;
      pending.delete(token);
      publish(reply.chatId, false);
    },
    cancel(chatId) {
      const tokens = [];
      for (const [token, reply] of pending) {
        if (reply.chatId === chatId) {
          tokens.push(token);
          pending.delete(token);
        }
      }
      publish(chatId, false);
      return tokens;
    },
  };
}
