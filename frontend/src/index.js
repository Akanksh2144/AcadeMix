import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import "./index.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes by default
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>

    </QueryClientProvider>
  </React.StrictMode>,
);
