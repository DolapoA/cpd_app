"use client";

import { useEffect, useState } from "react";

const PROFESSIONS: [string, string][] = [
  ["Physiotherapists", "registered with the HCPC"],
  ["Nurses & midwives", "registered with the NMC"],
  ["Doctors", "registered with the GMC"],
  ["Pharmacists", "registered with the GPhC"],
  ["Paramedics", "registered with the HCPC"],
  ["Dentists", "registered with the GDC"],
  ["Solicitors", "regulated by the SRA"],
  ["Radiographers", "registered with the HCPC"],
  ["Optometrists", "registered with the GOC"],
  ["Surveyors", "chartered with RICS"],
  ["Veterinary surgeons", "registered with the RCVS"],
  ["Financial advisers", "regulated by the FCA"],
  ["Architects", "registered with the ARB"],
  ["Accountants", "chartered with ICAEW"],
  ["Engineers", "registered with the Engineering Council"],
];

export function RollingProfessions() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PROFESSIONS.length);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const [profession, regulator] = PROFESSIONS[index];

  return (
    <div className="hero-roll">
      <span className="hero-roll__lead">Built for</span>
      {/* Keying on the index remounts these, which restarts the CSS entry
          animation on every swap. The first pair renders server-side, so the
          section still reads correctly with JavaScript disabled. */}
      <strong className="hero-roll__profession" key={`p${index}`}>
        {profession}
      </strong>
      <span className="hero-roll__regulator" key={`r${index}`}>
        {regulator}
      </span>
      <span className="hero-roll__all">…and every other profession with CPD obligations.</span>
    </div>
  );
}
