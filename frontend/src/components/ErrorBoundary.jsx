import { Component } from "react";

// The app's last line of defence. React has no hook equivalent — an error
// boundary has to be a class.
//
// Without one, a single throw anywhere in the tree unmounts EVERYTHING and
// leaves a blank page. That's bad in a browser tab and much worse in the
// packaged .exe, which is built --windowed: no console, no message, just a
// white window with no way to tell a crash from a failed launch.
//
// The scene is the specific risk worth guarding. It builds thousands of SVG
// nodes out of user-editable layout data, so one catalog key that stops
// resolving used to take the whole app down. `fallback` exists for exactly
// that case: App wraps the room in its own boundary, so a scene that can't
// draw leaves the HUD, the timer and the panels perfectly usable.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In dev this sits under Vite's overlay; in the packaged app it's the only
    // trace, so keep the component stack — it names the component that threw.
    console.error("TaskNook hit an error:", error, info?.componentStack);
  }

  retry() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.retry);

    return (
      <div className="grid h-full place-items-center px-6 text-center text-petal">
        <div className="max-w-sm space-y-3">
          <div className="text-4xl">🌧️</div>
          <p className="text-sm font-semibold text-cream">
            Something in TaskNook broke.
          </p>
          <p className="text-xs text-petal/60">
            Your tasks and your room are saved — reloading picks up where you
            left off.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="pill glass px-4 py-2 text-sm font-semibold text-glow shadow-soft hover:bg-white/10"
          >
            Reload TaskNook
          </button>
          {/* Collapsed by default: useful when reporting, noise otherwise. */}
          <details className="text-left">
            <summary className="cursor-pointer text-[11px] text-petal/40 hover:text-petal/70">
              Technical details
            </summary>
            <pre className="cozy-scroll mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[10px] text-petal/60">
              {String(error?.stack || error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
