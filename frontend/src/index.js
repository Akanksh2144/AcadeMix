import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions for replay
  replaysOnErrorSampleRate: 1.0, // Sample 100% of errors for replay
  beforeSend(event) {
    if (event.request && event.request.headers) {
      delete event.request.headers;
    }
    return event;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
