/**
 * The sections a signed-in user can reach, in the order they are shown.
 * Deliberately free of server imports: the navigation component that
 * highlights the current one runs on the client.
 *
 * Two labels each. The rail has room for the full one; the phone tab bar has
 * four tabs across 390px and does not.
 */
export const SECTIONS = [
  { href: "/dashboard", label: "Home", short: "Home", icon: "home" },
  { href: "/record", label: "My Record", short: "Record", icon: "record" },
  { href: "/registers", label: "My Registers", short: "Registers", icon: "registers" },
  { href: "/record/colleague-feedback", label: "Multi-Source Feedback", short: "MSF", icon: "msf" },
] as const;
