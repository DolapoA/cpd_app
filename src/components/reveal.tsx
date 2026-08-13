"use client";

import { useEffect, useRef } from "react";

/**
 * Fades and lifts its content into view once it is scrolled to.
 *
 * The hidden state is applied by JavaScript rather than in the stylesheet, so
 * with scripting off (or before hydration) the content is simply visible.
 * Anything already on screen when this arms is shown immediately rather than
 * animated, which avoids a flash of hidden content above the fold.
 */
export function Reveal({
  className = "",
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alreadyVisible = node.getBoundingClientRect().top < window.innerHeight * 0.92;
    if (alreadyVisible) {
      node.classList.add("reveal--in");
      return;
    }

    node.classList.add("reveal--armed");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("reveal--in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
