/**
 * The line shown wherever the app has just sent something and is asking
 * someone to go and look for it.
 *
 * One component rather than the sentence typed at each of the five places it
 * belongs: the wording is a small promise about where to look, and five
 * near-identical versions of it is how a product starts sounding careless.
 * A new sender has no reputation with the big providers, so this genuinely is
 * where a first email tends to land.
 */
export function JunkMailHint({ children }: { children?: React.ReactNode }) {
  return (
    <p className="hint">
      Nothing after a few minutes? Have a look in your junk or spam folder — a first email from a
      new sender often lands there.{children ? <> {children}</> : null}
    </p>
  );
}
