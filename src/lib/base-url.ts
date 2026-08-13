import "server-only";
import os from "os";
import { headers } from "next/headers";

export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (isLoopback(host) ? "http" : "https");
  return `${proto}://${host}`;
}

function isLoopback(host: string): boolean {
  const name = host.split(":")[0].toLowerCase();
  return name === "localhost" || name === "127.0.0.1" || name === "[::1]" || name === "::1";
}

/** First non-internal IPv4 address of this machine, e.g. "192.168.1.198". */
function lanAddress(): string | null {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return null;
}

export type ShareBase = {
  /** Origin to put in the QR code and share link. */
  url: string;
  /**
   * Set when the browsing origin was localhost and we substituted the machine's
   * LAN address instead. A QR pointing at localhost is useless — a phone
   * scanning it resolves localhost to itself — so the substitution is what makes
   * the code scannable while developing.
   */
  substitutedForLoopback: boolean;
  /** True when we were on localhost but could not find a LAN address to use. */
  unreachable: boolean;
};

export async function getShareBase(): Promise<ShareBase> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (isLoopback(host) ? "http" : "https");

  if (!isLoopback(host)) {
    return { url: `${proto}://${host}`, substitutedForLoopback: false, unreachable: false };
  }

  const lan = lanAddress();
  if (!lan) {
    return { url: `${proto}://${host}`, substitutedForLoopback: false, unreachable: true };
  }

  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  return { url: `${proto}://${lan}${port}`, substitutedForLoopback: true, unreachable: false };
}
