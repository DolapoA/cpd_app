"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, which exists so the browser will offer to
 * install the app at all — Chrome and Edge require one before they fire
 * `beforeinstallprompt`. iOS ignores it for install purposes but is happy to
 * have it.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A failed registration costs installability, not the app.
    });
  }, []);
  return null;
}
