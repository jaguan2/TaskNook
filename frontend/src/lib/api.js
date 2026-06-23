// Tiny fetch wrapper around the TaskNook REST API.
const TOKEN_KEY = "tasknook.token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
  logout: () => request("POST", "/auth/logout"),

  // tasks
  listTasks: () => request("GET", "/tasks"),
  createTask: (payload) => request("POST", "/tasks", payload),
  updateTask: (id, payload) => request("PUT", `/tasks/${id}`, payload),
  deleteTask: (id) => request("DELETE", `/tasks/${id}`),
  reorderTasks: (order) => request("PUT", "/tasks/reorder", { order }),

  // sessions + stats
  logSession: (payload) => request("POST", "/sessions", payload),
  stats: () => request("GET", "/stats"),

  // friends
  listFriends: () => request("GET", "/friends"),
  addFriend: (username) => request("POST", "/friends", { username }),
  removeFriend: (id) => request("DELETE", `/friends/${id}`),
};
