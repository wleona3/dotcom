import "@babel/polyfill";
import "whatwg-fetch";
import "focus-options-polyfill";
// import * as Sentry from '@sentry/react';
import * as Sentry from '@sentry/browser';
import { Integrations } from "@sentry/tracing";

if (window.sentry) {
  Sentry.init({
    dsn: window.sentry.dsn,
    // Alternatively, use `process.env.npm_package_version` for a dynamic release version
    // if your build tool supports it.
    // release: "my-project-name@2.3.12",
    integrations: [new Integrations.BrowserTracing()],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    // tracesSampleRate: 1.0,
  });
  console.log("Sentry initialized")
  console.log(Sentry)
}

import "../css/app.scss";
import "./app";
