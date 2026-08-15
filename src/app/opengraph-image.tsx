import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CPD Register — CPD evidence that captures itself";

/**
 * Generated rather than a static asset, so it stays in step with the wording.
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
          background: "#eef2f6",
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
              background: "#0e6e6b",
              marginRight: 20,
            }}
          />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#0a5452" }}>
            CPD Register
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 70,
              fontWeight: 700,
              color: "#16283a",
              letterSpacing: -2,
              lineHeight: 1.05,
              marginBottom: 24,
            }}
          >
            CPD evidence that captures itself
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#51667a", lineHeight: 1.35 }}>
            Attendance registers, verifiable slips, and a record ready for audit.
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {["HCPC", "GMC", "NMC", "GDC", "GPhC", "RICS"].map((r) => (
            <div
              key={r}
              style={{
                display: "flex",
                background: "#e3f1f0",
                color: "#0a5452",
                fontSize: 22,
                padding: "10px 20px",
                borderRadius: 999,
                marginRight: 12,
              }}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
