"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The tour: four short recordings of the real app, played in turn, each
 * captioned with what is being watched. A nurse signing at a study day, a
 * genomics scientist importing a spreadsheet, a counsellor recording a
 * journal club, a doctor planning a conference — NHS work, as it happens.
 *
 * Client-side because the sequence is a script: one clip ends, the next
 * begins, the caption changes. Someone who has asked for reduced motion is
 * not met by a moving picture — they get the first clip paused with
 * controls, and the dots still switch between them.
 */
const CLIPS = [
  {
    src: "/demo/sign.mp4",
    poster: "/demo/sign.jpg",
    title: "A nurse signs the register at a ward study day",
    label: "A nurse signs the register for a sepsis study day; it lands on her CPD record, marked platform-verified.",
  },
  {
    src: "/demo/import.mp4",
    poster: "/demo/import.jpg",
    title: "A genomics scientist imports a CPD spreadsheet",
    label: "A clinical scientist in genomics uploads a spreadsheet, checks the preview, and imports six entries.",
  },
  {
    src: "/demo/record.mp4",
    poster: "/demo/record.jpg",
    title: "Recording a journal club, with a line of reflection",
    label: "A genetic counsellor records a journal club with its date, hours and a sentence of reflection.",
  },
  {
    src: "/demo/plan.mp4",
    poster: "/demo/plan.jpg",
    title: "Planning a conference for next month",
    label: "A doctor adds a Royal College conference to their plan, and is offered it for their calendar.",
  },
];

export function DemoVideo() {
  const [index, setIndex] = useState(0);
  const [still, setStill] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // A remounted <video> (keyed on the clip) does not always honour autoPlay
  // on the second and later clips; asking explicitly is harmless where it did.
  useEffect(() => {
    const video = ref.current;
    if (!video || still) return;
    video.play().catch(() => {});
  }, [index, still]);

  const clip = CLIPS[index];

  return (
    <div className="demo__player">
      <p className="demo__caption" aria-live="polite">
        {clip.title}
      </p>
      <div className="phone-frame">
        <video
          key={clip.src}
          ref={ref}
          autoPlay={!still}
          controls={still}
          muted
          playsInline
          preload="auto"
          poster={clip.poster}
          aria-label={clip.label}
          onEnded={() => setIndex((i) => (i + 1) % CLIPS.length)}
        >
          <source src={clip.src} type="video/mp4" />
        </video>
      </div>
      <div className="demo__dots">
        {CLIPS.map((c, i) => (
          <button
            key={c.src}
            type="button"
            className={`demo__dot${i === index ? " is-on" : ""}`}
            aria-label={c.title}
            aria-current={i === index ? "true" : undefined}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
