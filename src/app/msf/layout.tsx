/**
 * Chrome for someone who is not a customer.
 *
 * A colleague following a link from their inbox has come to do one person a
 * favour. Account navigation above that is an advert, and an advert is the
 * wrong thing to put in front of somebody being asked for candour. Same
 * reasoning as the register-signing shell.
 */
export default function MsfLayout({ children }: { children: React.ReactNode }) {
  return <div className="guest-shell">{children}</div>;
}
