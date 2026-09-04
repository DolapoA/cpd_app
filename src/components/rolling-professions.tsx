"use client";

import { useEffect, useState } from "react";

/* NHS first: the people the register was built around. Each pairing names
   the body that actually holds the registration — clinical scientists, the
   bioinformatics specialism included, are HCPC; genetic counsellors are
   GCRB. The closing line carries everyone else. */
const PROFESSIONS: [string, string][] = [
  ["Nurses & midwives", "registered with the NMC"],
  ["Doctors", "registered with the GMC"],
  ["Clinical scientists in genomics", "registered with the HCPC"],
  ["Clinical scientists (bioinformatics)", "registered with the HCPC"],
  ["Genetic counsellors", "registered with the GCRB"],
  ["Biomedical scientists", "registered with the HCPC"],
  ["Physiotherapists", "registered with the HCPC"],
  ["Paramedics", "registered with the HCPC"],
  ["Radiographers", "registered with the HCPC"],
  ["Occupational therapists", "registered with the HCPC"],
  ["Dietitians", "registered with the HCPC"],
  ["Speech and language therapists", "registered with the HCPC"],
  ["Operating department practitioners", "registered with the HCPC"],
  ["Pharmacists", "registered with the GPhC"],
  ["Dentists & dental nurses", "registered with the GDC"],
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
