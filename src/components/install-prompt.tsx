"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { track } from "@vercel/analytics";

/**
 * The "add this to your home screen" nudge.
 *
 * Two platforms, two mechanisms. Android and desktop Chrome/Edge fire
 * `beforeinstallprompt`, which is captured and replayed behind a one-tap
 * Install button. iOS Safari exposes no programmatic install at all — no
 * event, no API — so iPhone users get a pointer at the Share button instead,
 * which is the only route Apple offers.
 *
 * Gated rather than shown on arrival: once per device, never to someone
 * already running it installed, and only after enough time to have got
 * something out of the app. An install prompt on first paint asks for
 * commitment before the visit has earned any.
 */

const DISMISS_KEY = "cpd:install-dismissed";
const TRACKED_KEY = "cpd:install-tracked";
/** Long enough to have done something; short enough to be the same visit. */
const SHOW_AFTER_MS = 30000;
/** Someone who has just signed a register is the readiest audience there is. */
const SIGNED_DELAY_MS = 6000;

/**
 * How long to wait on this page, or null to stay away entirely.
 *
 * The sign-in form for a guest is the one place this must never appear: they
 * are standing at the back of a lecture theatre with a phone in one hand, and
 * a panel sliding over the form is an obstruction, not an offer. One screen
 * later — slip issued, nothing left to do — is the best moment in the app.
 */
function delayFor(pathname: string): number | null {
  if (/^\/r\/[^/]+$/.test(pathname)) return null;
  if (/^\/r\/[^/]+\/signed$/.test(pathname)) return SIGNED_DELAY_MS;
  return SHOW_AFTER_MS;
}

type Deferred = Event & { prompt: () => void; userChoice: Promise<unknown> };

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent || "");

const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

const isIOS = () =>
  /iphone|ipad|ipod/i.test(ua()) ||
  (/Macintosh/.test(ua()) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);

/** Add to Home Screen lives in Safari's share sheet; other iOS browsers differ. */
const isIOSSafari = () => isIOS() && /safari/i.test(ua()) && !/crios|fxios|edgios/i.test(ua());

const platform = () => (isIOS() ? "ios" : /android/i.test(ua()) ? "android" : "desktop");

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Private browsing refuses storage. The prompt then reappears next visit,
    // which is a smaller problem than throwing here would be.
  }
}

/** Counted once per device, whichever way the install is noticed. */
function trackInstall(via: "appinstalled" | "standalone"): void {
  if (readFlag(TRACKED_KEY)) return;
  setFlag(TRACKED_KEY);
  try {
    track("app_installed", { platform: platform(), via });
  } catch {
    // Analytics must never break anything a user is doing.
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<Deferred | null>(null);
  const [visible, setVisible] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [ios, setIos] = useState(false);

  // Runs once: the install signals, and the timer that decides "engaged".
  useEffect(() => {
    // Running from the home screen is the only install signal iOS ever gives,
    // and a reliable catch-all everywhere else.
    if (isInstalled()) {
      trackInstall("standalone");
      return;
    }

    // Counting the install is not conditional on having offered it. Someone
    // who dismissed the nudge and then installed from the browser's own menu
    // is exactly the install worth knowing about, and the early return that
    // used to sit here meant it was never seen.
    const onInstalled = () => {
      trackInstall("appinstalled");
      setFlag(DISMISS_KEY);
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    if (readFlag(DISMISS_KEY)) {
      return () => window.removeEventListener("appinstalled", onInstalled);
    }

    setIos(isIOSSafari());

    // Captured wherever they are: the offer may be made on a later page.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as Deferred);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const delay = delayFor(pathname);
    const timer = delay === null ? null : setTimeout(() => setEngaged(true), delay);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

  // Shown only once there is something to offer: a captured prompt, or an
  // iPhone where the instructions are the offer.
  useEffect(() => {
    if (!engaged || visible || isInstalled() || readFlag(DISMISS_KEY)) return;
    if (delayFor(pathname) === null) return;
    if (!deferred && !ios) return;
    setVisible(true);
    try {
      track("install_prompt_shown", { platform: platform() });
    } catch {
      // As above.
    }
  }, [engaged, deferred, ios, visible, pathname]);

  if (!visible) return null;

  const dismiss = () => {
    setFlag(DISMISS_KEY);
    setVisible(false);
    try {
      track("install_prompt_dismissed", { platform: platform() });
    } catch {
      // As above.
    }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // The choice is reported by `appinstalled` either way.
    }
    setDeferred(null);
    dismiss();
  };

  return (
    <div className="install-prompt" role="dialog" aria-label="Install CPD Register">
      <div className="install-prompt__body">
        <p className="install-prompt__title">Add CPD Register to your home screen</p>
        {ios && !deferred ? (
          <p className="install-prompt__sub">
            Tap{" "}
            <span className="install-prompt__share" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" />
                <path d="M8.5 6.5 12 3l3.5 3.5" />
                <path d="M6 11v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8" />
              </svg>
            </span>{" "}
            then <strong>Add to Home Screen</strong>
          </p>
        ) : (
          <p className="install-prompt__sub">Open it in one tap, and sign a register faster.</p>
        )}
      </div>
      {deferred && (
        <button type="button" className="btn btn--small" onClick={install}>
          Install
        </button>
      )}
      <button
        type="button"
        className="install-prompt__close"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
