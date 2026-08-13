"use client";

/**
 * The last resort: an error in the root layout itself, where the app's own
 * stylesheet may not have loaded. Styles are inline for that reason.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: "3rem 1.5rem",
          color: "#16283a",
          background: "#eef2f6",
        }}
      >
        <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>CPD Register is unavailable</h1>
          <p style={{ color: "#51667a" }}>
            Something failed while loading the app. Your saved data is not affected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              fontWeight: 600,
              color: "#fff",
              background: "#0e6e6b",
              border: "1px solid #0e6e6b",
              borderRadius: "8px",
              padding: "0.55rem 1.1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
