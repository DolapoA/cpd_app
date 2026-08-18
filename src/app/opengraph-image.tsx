import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CPD Register — CPD evidence that captures itself. Free to use.";

/* The palette, hand-copied from the tokens: satori cannot read the stylesheet.
   Alongside the app icon, this is the only place in the app that repeats a
   colour on purpose. */
const BRAND = "#0e6e6b";
const ON_BRAND = "#ffffff";
const ON_BRAND_SOFT = "#bfe6e3";
const ON_BRAND_FAINT = "#8fdad6";
const BAR = "#7fd4cf";

/**
 * The card people see before they see the app.
 *
 * Generated rather than a static asset, so it stays in step with the wording.
 *
 * The ground is solid brand rather than the app's own pale paper, and that is
 * the whole point of it. A near-white card posted into a near-white feed has
 * no edge: it reads as part of somebody's message rather than as a thing to
 * open. It also has to survive being shrunk — a chat app shows this at around
 * 240px, where a paragraph is a grey smear and a filled block is still a
 * filled block. So the type is large, the contrast is high, and the one fact
 * most likely to earn a click sits on its own at the end.
 *
 * Two constraints from the renderer: every element with more than one child
 * needs an explicit display, and only characters in the bundled font are safe
 * — anything else triggers a font fetch that fails during the build.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND,
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 16,
              height: 44,
              borderRadius: 4,
              background: BAR,
              marginRight: 20,
            }}
          />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: ON_BRAND }}>
            CPD Register
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 700,
              color: ON_BRAND,
              letterSpacing: -2,
              lineHeight: 1.03,
              marginBottom: 22,
            }}
          >
            CPD evidence that captures itself
          </div>
          <div style={{ display: "flex", fontSize: 30, color: ON_BRAND_SOFT, lineHeight: 1.35 }}>
            Sign the register at the event. It lands on your record, verified.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {["HCPC", "GMC", "NMC", "GDC", "GPhC", "RICS"].map((r) => (
            <div
              key={r}
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.14)",
                color: ON_BRAND,
                fontSize: 22,
                padding: "10px 20px",
                borderRadius: 999,
                marginRight: 12,
              }}
            >
              {r}
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", fontSize: 24, color: ON_BRAND_FAINT }}>
            Free to use
          </div>
        </div>
      </div>
    ),
    size
  );
}
