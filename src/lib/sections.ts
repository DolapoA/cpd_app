/**
 * The sections a signed-in user can reach, in the order they are shown.
 * Deliberately free of server imports: the navigation component that
 * highlights the current one runs on the client.
 */
export const SECTIONS = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: "◉" },
  { href: "/record", label: "My record", short: "Record", icon: "▤" },
  { href: "/registers", label: "My registers", short: "Registers", icon: "▣" },
] as const;
