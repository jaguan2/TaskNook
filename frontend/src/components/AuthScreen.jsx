import { useState } from "react";
import { useStore } from "../store";
import Cottage from "./Cottage";

const AVATARS = ["🌙", "🌸", "🍵", "🌧️", "🐱", "📚", "🌿", "⭐"];

export default function AuthScreen() {
  const { login, register } = useStore();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("🌙");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login({ username, password });
      } else {
        await register({ username, password, displayName, avatar });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const tryDemo = async () => {
    setError("");
    setBusy(true);
    try {
      await login({ username: "luna", password: "lofi123" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid h-full w-full place-items-center px-4">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 md:flex-row md:gap-12">
        <div className="hidden flex-1 md:block">
          <Cottage focused />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6 text-center md:text-left">
            <h1 className="text-3xl font-bold text-cream">TaskNook 🏡</h1>
            <p className="mt-1 text-sm text-petal/80">
              A cozy little place to get things done.
            </p>
          </div>

          <form onSubmit={submit} className="glass space-y-3 rounded-3xl p-6 shadow-soft">
            <div className="flex gap-2 rounded-full bg-white/5 p-1">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`pill flex-1 py-1.5 text-sm font-semibold capitalize transition ${
                    mode === m ? "bg-glow text-plum" : "text-petal"
                  }`}
                >
                  {m === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            {mode === "register" && (
              <>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full rounded-xl bg-white/10 px-3 py-2 text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
                />
                <div className="flex flex-wrap gap-1.5">
                  {AVATARS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`pill grid h-9 w-9 place-items-center text-lg ${
                        avatar === a ? "bg-glow" : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </>
            )}

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="w-full rounded-xl bg-white/10 px-3 py-2 text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl bg-white/10 px-3 py-2 text-cream placeholder:text-petal/50 outline-none focus:ring-2 focus:ring-glow/50"
            />

            {error && <p className="text-sm text-rose">{error}</p>}

            <button
              disabled={busy}
              className="pill w-full bg-glow py-2.5 font-semibold text-plum hover:bg-amber disabled:opacity-50"
            >
              {busy ? "…" : mode === "login" ? "Enter the cottage" : "Create my cottage"}
            </button>

            <button
              type="button"
              onClick={tryDemo}
              disabled={busy}
              className="w-full text-center text-xs text-petal/70 underline-offset-2 hover:underline"
            >
              or peek inside with the demo account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
