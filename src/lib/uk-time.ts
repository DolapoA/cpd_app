/**
 * Times typed into this app are UK wall-clock times.
 *
 * The server they are parsed on is not in the UK: Vercel runs functions in
 * UTC, so `new Date("2026-08-21T09:00")` there is 09:00 UTC — which in August
 * is 10:00 in London. Every register created that way opened an hour late for
 * its organiser, and two hours late for a tester in Italy, who worked out the
 * lag to within the DST boundary ("UK winter time or something") from the
 * outside. It never showed in development because the development machine's
 * timezone *is* Europe/London, which parsed the same string correctly.
 *
 * So the conversion is done by hand: read the wall time as if it were UTC,
 * then shift by however far London actually was from UTC at that moment.
 */

/** London's offset from UTC at a given instant, in minutes. 0 or 60. */
function ukOffsetMinutes(instant: Date): number {
  const name =
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      timeZoneName: "longOffset",
    })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/);
  if (!m || !m[1]) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/**
 * The instant at which a UK clock shows this date and time.
 *
 * The first guess treats the wall time as UTC, which is at most an hour out;
 * the offset is then read *at the corrected instant* and applied again, so a
 * time within an hour of a clock change still lands on the right side of it.
 * Returns an invalid Date for an invalid input, same as the constructor.
 */
export function ukWallTimeToInstant(date: string, time: string): Date {
  const wall = `${date}T${time.length === 5 ? `${time}:00` : time}Z`;
  const asUtc = new Date(wall);
  if (isNaN(asUtc.getTime())) return asUtc;

  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const corrected = new Date(asUtc.getTime() - ukOffsetMinutes(guess) * 60000);
    if (corrected.getTime() === guess.getTime()) break;
    guess = corrected;
  }
  return guess;
}
