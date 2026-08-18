"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { removePushSubscription, savePushSubscription } from "@/lib/actions";

/**
 * Turning notifications on, which is mostly a matter of telling the truth
 * about why they cannot be turned on.
 *
 * Four ways this is unavailable, and each needs a different sentence:
 *
 *  - The browser has no Push API at all. Nothing to offer.
 *  - iPhone, not installed. Apple has supported web push since iOS 16.4 but
 *    only for a site added to the Home Screen, so the honest answer is an
 *    instruction to install rather than a button that would fail.
 *  - Permission already denied. The browser will not ask twice, and no amount
 *    of asking from here changes that — it has to be undone in site settings.
 *  - The keys are not configured on the server. Nobody's fault but ours.
 *
 * The permission prompt must come from a real tap: browsers ignore a request
 * that is not the direct result of a gesture, and a request that is ignored
 * counts as a refusal on some of them. So it happens in the click handler and
 * nowhere else.
 */

/**
 * The VAPID key travels as base64url; the API wants raw bytes.
 *
 * Backed by an explicit ArrayBuffer rather than the default, because
 * `applicationServerKey` will not accept a view that might be over shared
 * memory and the default type says it might be.
 */
function toBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** The keys arrive as ArrayBuffers and have to be posted as text. */
function encodeKey(key: ArrayBuffer | null): string {
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
};

const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

type State =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "no-keys"
  | "blocked"
  | "off"
  | "on"
  | "working";

export function PushToggle({ publicKey, devices }: { publicKey: string | null; devices: number }) {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!publicKey) return setState("no-keys");
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // The iPhone check comes second: an iPhone that has not been installed
    // reports no PushManager at all, and "your browser cannot" would be a
    // worse answer than "add it to your Home Screen first".
    if (isIOS() && !isInstalled()) return setState("needs-install");
    if (!supported) return setState("unsupported");
    if (Notification.permission === "denied") return setState("blocked");

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [publicKey]);

  async function turnOn() {
    setError(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(publicKey as string),
      });

      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? encodeKey(sub.getKey("p256dh")),
        auth: json.keys?.auth ?? encodeKey(sub.getKey("auth")),
        label: isIOS() ? "iPhone or iPad" : /android/i.test(navigator.userAgent) ? "Android" : "This computer",
      });

      if ("error" in result) {
        // The browser now holds a subscription the server does not know about,
        // which would be a device that never receives anything. Undo it.
        await sub.unsubscribe().catch(() => {});
        setError(result.error);
        setState("off");
        return;
      }
      setState("on");
      router.refresh();
    } catch {
      setError("The browser would not complete that. Try again, or check the site permissions.");
      setState("off");
    }
  }

  async function turnOff() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      } else {
        await removePushSubscription();
      }
    } catch {
      // The server row is what decides whether anything is sent, so a browser
      // that will not unsubscribe cleanly still stops receiving.
      await removePushSubscription().catch(() => {});
    }
    setState("off");
    router.refresh();
  }

  if (state === "checking") return <p className="muted small">Checking this device&hellip;</p>;

  if (state === "no-keys")
    return (
      <div className="notice notice--warn">
        <p className="small">
          Notifications are not configured on the server yet, so there is nothing to switch on.
        </p>
      </div>
    );

  if (state === "needs-install")
    return (
      <div className="notice notice--info">
        <h3 className="notice__title">Add the app to your Home Screen first</h3>
        <p className="small">
          On an iPhone or iPad, notifications only work once the app is installed. Tap the Share
          button in Safari, choose <strong>Add to Home Screen</strong>, then open CPD Register from
          the icon and come back here.
        </p>
      </div>
    );

  if (state === "unsupported")
    return (
      <div className="notice notice--info">
        <p className="small">
          This browser cannot show notifications. Chrome, Edge and Firefox can, and so can an
          iPhone once the app is on the Home Screen.
        </p>
      </div>
    );

  if (state === "blocked")
    return (
      <div className="notice notice--warn">
        <h3 className="notice__title">Notifications are blocked for this site</h3>
        <p className="small">
          The browser will not ask again, so this has to be undone in its own settings — the icon
          at the left of the address bar, then <strong>Notifications &rarr; Allow</strong>. On a
          phone it is under Site settings.
        </p>
      </div>
    );

  return (
    <div className="stack stack--tight">
      {state === "on" ? (
        <>
          <p className="small">
            This device will receive notifications.{" "}
            {devices > 1 && `${devices} devices are set up in total.`}
          </p>
          <div className="actions-row">
            <button type="button" className="btn btn--secondary" onClick={turnOff}>
              Turn off on this device
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="small">
            {devices > 0
              ? `Another device is already set up. Turn this one on too if you want both.`
              : "Nothing is sent until you allow it, and it can be turned off here at any time."}
          </p>
          <div className="actions-row">
            <button
              type="button"
              className="btn"
              onClick={turnOn}
              disabled={state === "working"}
            >
              {state === "working" ? "Just a moment…" : "Turn on notifications"}
            </button>
          </div>
        </>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
