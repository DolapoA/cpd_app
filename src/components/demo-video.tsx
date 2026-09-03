"use client";

import { useEffect, useRef } from "react";

/**
 * The loop, recorded: a real run through the demo register, from name and
 * email to a verified code.
 *
 * Client-side only for one reason — someone who has asked for reduced motion
 * should not be met by a looping video, and there is no CSS that stops
 * autoplay. They get the same clip, paused, with controls.
 */
export function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.controls = true;
    }
  }, []);

  return (
    <div className="phone-frame">
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/demo-loop.jpg"
        aria-label="Signing the demo register: a name and email, then an attendance slip with a verification code, then that code verified."
      >
        <source src="/demo-loop.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
