import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { StoreProvider } from "./store";
import { TimerProvider } from "./timer";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Outermost boundary: whatever throws, the user gets a message and a way
        back instead of a blank window (the packaged app has no console). */}
    <ErrorBoundary>
      {/* TimerProvider nests INSIDE the store (it reads the active task and
          logs sessions through it) and wraps App, so the timer's per-second
          tick reaches only the components that display a clock. */}
      <StoreProvider>
        <TimerProvider>
          <App />
        </TimerProvider>
      </StoreProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
