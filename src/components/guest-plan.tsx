"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PdpFields } from "./pdp-fields";
import { GUEST_PLAN_KEY, GUEST_PLAN_MAX, parseGuestGoals, type GuestGoal } from "@/lib/guest-plan";
import { daysUntil, goalUrgency } from "@/lib/goal";

/**
 * Writing a development plan without an account.
 *
 * The same five questions as the real thing, the same fields component, and
 * a list that grows as goals are added — held in this browser only. "Finish"
 * turns the list into the offer: keep it by creating an account, where the
 * draft becomes real goals, or log in and it joins the plan already there.
 */
export function GuestPlan() {
  const [goals, setGoals] = useState<GuestGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [finished, setFinished] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    try {
      setGoals(parseGuestGoals(localStorage.getItem(GUEST_PLAN_KEY)));
    } catch {
      /* private mode, or storage blocked: the plan simply does not persist */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (goals.length) localStorage.setItem(GUEST_PLAN_KEY, JSON.stringify(goals));
      else localStorage.removeItem(GUEST_PLAN_KEY);
    } catch {
      /* as above */
    }
  }, [goals, loaded]);

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const [goal] = parseGuestGoals([Object.fromEntries(data.entries())]);
    if (!goal) return;
    setGoals((list) => [...list, goal].slice(0, GUEST_PLAN_MAX));
    event.currentTarget.reset();
    formRef.current?.querySelector<HTMLInputElement>("#title")?.focus();
  }

  if (finished && goals.length > 0) {
    return (
      <div className="card">
        <h2>
          {goals.length === 1 ? "One goal, ready to keep" : `${goals.length} goals, ready to keep`}
        </h2>
        <p className="muted">
          Create a free account and this plan is waiting on it — with the record, the reviews and
          the appraisal pack that go with it.
        </p>
        <ul className="goal-list stack">
          {goals.map((g, i) => (
            <li key={i} className="goal-history">
              <span className="goal-card__title">{g.title}</span>
              {g.target_date && <span className="muted small">Target {g.target_date}</span>}
            </li>
          ))}
        </ul>
        <div className="actions-row">
          <Link href="/signup" className="btn btn--large">
            Create a free account
          </Link>
          <Link href="/login" className="btn btn--quiet">
            I already have one
          </Link>
          <button type="button" className="btn btn--quiet" onClick={() => setFinished(false)}>
            Keep editing
          </button>
        </div>
        <p className="muted small">
          Until then it stays in this browser only. Nothing has been sent anywhere.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      {goals.length > 0 && (
        <div className="stack">
          {goals.map((g, i) => {
            const days = daysUntil(g.target_date || null);
            const urgency = goalUrgency(days);
            return (
              <div key={i} className="card goal-card">
                <div className="goal-card__head">
                  <span className="goal-card__title">{g.title}</span>
                  {days !== null && (
                    <span className={`badge ${urgency === "overdue" ? "badge--closed" : urgency === "urgent" ? "badge--pending" : "badge--neutral"}`}>
                      {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "due today" : `${days} days left`}
                    </span>
                  )}
                </div>
                <span className="muted small">
                  {[g.identified_from ? `From ${g.identified_from}` : null, g.actions || null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <button
                  type="button"
                  className="btn btn--quiet btn--small"
                  onClick={() => setGoals((list) => list.filter((_, n) => n !== i))}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <h2>{goals.length === 0 ? "Your first goal" : "Another goal"}</h2>
        <form ref={formRef} onSubmit={add}>
          <PdpFields />
          <div className="actions-row">
            <button type="submit" className="btn">
              Add to my plan
            </button>
            {goals.length > 0 && (
              <button type="button" className="btn btn--secondary" onClick={() => setFinished(true)}>
                Finish{goals.length > 1 ? ` (${goals.length} goals)` : ""}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
