// Tiny fetch wrapper around the TaskNook REST API.
import { readStored, removeStored, writeStored } from "./storage";

const TOKEN_KEY = "tasknook.token";

export function getToken() {
  return readStored(TOKEN_KEY);
}
export function setToken(token) {
  if (token) writeStored(TOKEN_KEY, token);
  else removeStored(TOKEN_KEY);
}

/**
 * How to get a fresh token, registered by the store.
 *
 * There is no login screen — the app signs itself into one fixed local account at
 * boot — so a token that stops working mid-session had no recovery at all: every
 * call failed with a toast until the user thought to reload. And it does stop
 * working, by design: `issue_token` prunes to the newest MAX_TOKENS_PER_USER per
 * user, so opening the app in a few windows retires the oldest tab's token while
 * that tab is still sitting there.
 *
 * A callback rather than importing the credentials here, because the store owns
 * them and owns the login-or-register dance.
 */
let reauthorize = null;
export function setReauthorizer(fn) {
  reauthorize = fn;
}

// One shared attempt, so a burst of parallel 401s (refreshAll fires four calls
// at once) produces a single login rather than four racing ones.
//
// `staleToken` is the token the 401'd request actually sent. Two subtleties
// both exist because a 401 response can sit buffered on the wire while the
// winning racer completes a whole login:
// - the token wipe lives INSIDE the single flight, so only the caller that
//   starts a login clears storage — when it sat in request(), every racer
//   wiped, including one arriving after the replacement token was stored;
// - a late racer that finds a token DIFFERENT from the one it sent doesn't
//   need a login at all: someone already finished one, and starting another
//   burned a second row against MAX_TOKENS_PER_USER (and, if that second
//   login failed, left the tab with no token and no way to re-auth).
let reauthInFlight = null;
function reauthorizeOnce(staleToken) {
  if (!reauthInFlight) {
    const current = getToken();
    if (current && current !== staleToken) return Promise.resolve(current);
    reauthInFlight = Promise.resolve()
      .then(() => {
        setToken(null);
        return reauthorize?.();
      })
      .finally(() => {
        reauthInFlight = null;
      });
  }
  return reauthInFlight;
}

async function request(method, path, body, { retrying = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Without a deadline, a wedged backend (locked SQLite, slow first-run
      // migration) hangs every caller forever — including boot, which would
      // otherwise sit on the splash with the retry screen unreachable.
      signal: AbortSignal.timeout(15000),
    });
  } catch (cause) {
    const err = new Error(
      cause?.name === "TimeoutError" ? "Request timed out" : "Couldn't reach the backend"
    );
    err.status = 0;
    throw err;
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    // A 401 mid-session means this tab's token was pruned, not that the user did
    // anything wrong. Re-authenticate once and replay the call, so the failure is
    // invisible instead of a wall of toasts until a manual reload.
    //
    // Never for /auth/* (that would recurse through the very call being retried),
    // never twice for one request, and only when we actually had a token to lose.
    if (
      res.status === 401 &&
      !retrying &&
      token &&
      reauthorize &&
      !path.startsWith("/auth/")
    ) {
      const fresh = await reauthorizeOnce(token);
      if (fresh) return request(method, path, body, { retrying: true });
    }
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request("POST", "/auth/register", payload),
  login: (payload) => request("POST", "/auth/login", payload),
  me: () => request("GET", "/auth/me"),

  // tasks
  listTasks: () => request("GET", "/tasks"),
  createTask: (payload) => request("POST", "/tasks", payload),
  updateTask: (id, payload) => request("PUT", `/tasks/${id}`, payload),
  deleteTask: (id) => request("DELETE", `/tasks/${id}`),
  reorderTasks: (order) => request("PUT", "/tasks/reorder", { order }),

  // room decoration (flat layout + isometric layout travel together)
  getRoom: () => request("GET", "/room"),
  saveRoom: (placements, iso) => request("PUT", "/room", { placements, iso }),
  getUnlocks: () => request("GET", "/unlocks"),
  saveUnlocks: (unlocked) => request("PUT", "/unlocks", { unlocked }),
  // What you focused ON during one day. Fetched per selected day rather than
  // wholesale like sessionDays — names are wanted one day at a time.
  sessionDay: (day) => request("GET", `/sessions/day?day=${encodeURIComponent(day)}`),
  getProfile: () => request("GET", "/profile"),
  // Every field optional — send only the section that changed, or the server
  // will keep the rest untouched anyway. See test_profile.py.
  saveProfile: (patch) => request("PUT", "/profile", patch),

  // sessions + stats
  logSession: (payload) => request("POST", "/sessions", payload),
  stats: () => request("GET", "/stats"),
  sessionDays: () => request("GET", "/sessions/days"),

  // friends
  listFriends: () => request("GET", "/friends"),
  addFriend: (username) => request("POST", "/friends", { username }),
  removeFriend: (id) => request("DELETE", `/friends/${id}`),

  // visiting
  friendRoom: (id) => request("GET", `/friends/${id}/room`),
  setVisitAccess: (value) => request("PUT", "/visit-access", { value }),
};
