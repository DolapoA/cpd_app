"use client";

import { useEffect, useRef, useState } from "react";
import chapters from "./demo-chapters.json";

/**
 * The tour: five short journeys through the real app in one recording, each
 * opening on a title card that says what is about to happen. A nurse signing
 * at a study day, a genomics scientist importing a spreadsheet, a counsellor
 * recording a journal club, a doctor planning a conference, a scientist
 * writing a development plan.
 *
 * One file rather than five, so the hand-over between journeys is a fade
 * inside the picture instead of a reload of the player. The chapter marks
 * come from the file itself — written by the script that assembles it — so
 * the buttons below can never drift from the cuts.
 *
 * Someone who has asked for reduced motion is not met by a moving picture:
 * they get the same recording paused, with controls, and the buttons still
 * take them to any chapter.
 */
export function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function onTime() {
    const t = ref.current?.currentTime ?? 0;
    let i = 0;
    chapters.forEach((c, n) => {
      if (t >= c.start - 0.05) i = n;
    });
    if (i !== current) setCurrent(i);
  }

  function jump(n: number) {
    const video = ref.current;
    if (!video) return;
    video.currentTime = chapters[n].start;
    setCurrent(n);
    video.play().catch(() => {});
  }

  return (
    <div className="demo__player">
      <div className="phone-frame">
        <video
          ref={ref}
          autoPlay={!still}
          controls={still}
          muted
          loop
          playsInline
          preload="auto"
          poster="/demo/tour.jpg"
          onTimeUpdate={onTime}
          aria-label="Five short recordings of the app: a nurse signing a register at a study day, a genomics scientist importing a spreadsheet, a genetic counsellor recording a journal club, a doctor planning a conference, and a clinical scientist writing a development plan."
        >
          <source src="/demo/tour.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="demo__chapters" role="group" aria-label="Choose a demonstration">
        {chapters.map((c, n) => (
          <button
            key={c.key}
            type="button"
            className={`demo__chapter${n === current ? " is-on" : ""}`}
            aria-pressed={n === current}
            onClick={() => jump(n)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
