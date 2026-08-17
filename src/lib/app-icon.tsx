import { ImageResponse } from "next/og";

/**
 * The home-screen icon, drawn rather than stored.
 *
 * Same argument as the social image: an asset in a folder drifts from the
 * brand the moment either changes, and this one has to exist at four sizes.
 * The palette is hand-copied from the tokens because satori has no access to
 * the stylesheet — the two literals here are the only place in the app that
 * repeats a colour on purpose.
 */
const BRAND = "#0e6e6b";
const INK_ON_BRAND = "#ffffff";

export function renderAppIcon(size: number, { maskable = false } = {}) {
  // Maskable icons are cropped to whatever shape the launcher likes, so the
  // artwork has to sit inside the safe zone — 80% of the width, centred.
  const inset = maskable ? size * 0.1 : 0;
  const box = size - inset * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
        }}
      >
        <div
          style={{
            width: box,
            height: box,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            fontSize: box * 0.34,
            fontWeight: 700,
            letterSpacing: -box * 0.012,
            color: INK_ON_BRAND,
          }}
        >
          CPD
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
