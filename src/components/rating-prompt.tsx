import { dismissRatingPrompt, saveAppReview } from "@/lib/actions";

/**
 * The one time the app asks what somebody makes of it.
 *
 * A card in the page rather than a dialog over it. Nobody opens their CPD
 * record in order to review software, so this waits its turn instead of
 * standing in front of what they came for — and "Not now" is a real button
 * beside the others rather than a cross in a corner.
 *
 * Plain radios and a plain form: no stars, no JavaScript, and it works the
 * same on a phone at the back of a lecture theatre as anywhere else.
 */
export function RatingPrompt({ name, profession }: { name: string; profession: string | null }) {
  const quotedAs = [name.split(" ")[0], profession].filter(Boolean).join(", ");

  return (
    <form action={saveAppReview} className="card stack rating-ask">
      <h2>How are you finding CPDRegister?</h2>

      <fieldset className="rating-ask__scale">
        <legend className="small">Out of 5</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="rating-ask__option" htmlFor={`rating-${n}`}>
            <input id={`rating-${n}`} type="radio" name="rating" value={n} required />
            <span>{n}</span>
          </label>
        ))}
        <span className="hint rating-ask__ends">1 poor &middot; 5 excellent</span>
      </fieldset>

      <div className="field">
        <label htmlFor="review">Anything you would add?</label>
        <textarea id="review" name="review" rows={3} maxLength={400} />
      </div>

      <div>
        <label className="choice" htmlFor="consent">
          <input id="consent" name="consent" type="checkbox" /> You may quote this on the CPD
          Register website
        </label>
        {/* Said plainly and in full, because "may we quote you" without saying
            what would appear is not a question anybody can answer. */}
        <div className="hint">Shown as &ldquo;{quotedAs || "Anonymous"}&rdquo;. Never your email.</div>
      </div>

      <div className="actions-row">
        <button type="submit" className="btn">
          Send
        </button>
        {/* formNoValidate, or the required rating would stop somebody from
            declining to give one — which is the whole meaning of "not now". */}
        <button
          type="submit"
          formAction={dismissRatingPrompt}
          formNoValidate
          className="btn btn--quiet"
        >
          Not now
        </button>
      </div>
    </form>
  );
}
