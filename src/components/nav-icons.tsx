/**
 * Navigation icons.
 *
 * Inline SVG rather than Unicode glyphs: the geometric characters that were
 * here before (◉ ▤ ▣) render at a different weight and baseline on every
 * platform, and none of them means anything. These are drawn to a shared
 * 20×20 grid with one stroke weight, and take their colour from the link, so
 * the active state carries into them without a second rule.
 */

const shared = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

/** A house — the section is labelled Home, so the literal reading is the clearest. */
function HomeIcon() {
  return (
    <svg {...shared}>
      <path d="M3 8.7 10 3.2l7 5.5" />
      <path d="M4.9 10.2V16a1 1 0 0 0 1 1h8.2a1 1 0 0 0 1-1v-5.8" />
      <path d="M8.4 17v-3.8h3.2V17" />
    </svg>
  );
}

/** A ruled page: the record is a written account of activity, not a folder. */
function RecordIcon() {
  return (
    <svg {...shared}>
      <path d="M5.6 2.6h5.2L15 6.5V17a.9.9 0 0 1-.9.9H5.6a.9.9 0 0 1-.9-.9V3.5a.9.9 0 0 1 .9-.9Z" />
      <path d="M10.7 2.7v3.9h4.1" />
      <path d="M7.2 11h5.6M7.2 14h4" />
    </svg>
  );
}

/** A clipboard with a tick — what an attendance register physically is. */
function RegistersIcon() {
  return (
    <svg {...shared}>
      <path d="M7.6 4.1H6.2a1 1 0 0 0-1 1v11.5a1 1 0 0 0 1 1h7.6a1 1 0 0 0 1-1V5.1a1 1 0 0 0-1-1h-1.4" />
      <rect x="7.5" y="2.3" width="5" height="3.3" rx="1.1" />
      <path d="M7.8 12.1l1.7 1.7 3.4-3.5" />
    </svg>
  );
}

/** Two colleagues — feedback is other people's view of you. */
function MsfIcon() {
  return (
    <svg {...shared}>
      <circle cx="7" cy="6.6" r="2.6" />
      <path d="M2.8 16.6v-1.2a4.2 4.2 0 0 1 8.4 0v1.2" />
      <circle cx="14.2" cy="7.6" r="2.1" />
      <path d="M13.3 12.3a3.6 3.6 0 0 1 4.2 3.1v1.2" />
    </svg>
  );
}

/** An arrow leaving a flag-marked path — a plan is a route to somewhere. */
function PdpIcon() {
  return (
    <svg {...shared}>
      <path d="M3.4 16.6c.4-4.4 2.6-6.9 6.6-7.5" />
      <path d="M13.4 5.4h3.4v3.4" />
      <path d="M16.6 5.6 9.8 12.4" />
      <circle cx="3.4" cy="16.6" r="1" />
    </svg>
  );
}

const ICONS: Record<string, () => React.JSX.Element> = {
  home: HomeIcon,
  record: RecordIcon,
  registers: RegistersIcon,
  msf: MsfIcon,
  pdp: PdpIcon,
};

export function NavIcon({ name }: { name: string }) {
  const Icon = ICONS[name];
  return Icon ? <Icon /> : null;
}
