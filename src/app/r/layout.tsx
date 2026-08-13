/**
 * Chrome for the attendee-facing pages.
 *
 * Someone signing a register is standing in a room with a phone in one hand.
 * They are not browsing the product, so the account navigation above them is
 * noise at best and a distraction from the one thing they came to do. This
 * wrapper marks those pages so the site header can step out of the way; the
 * mark is a class rather than a prop because the header is rendered by the
 * root layout, above this one.
 */
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return <div className="guest-shell">{children}</div>;
}
