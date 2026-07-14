/**
 * Smart bilingual caption suggestions — unique ChatSnap voice.
 * No cloud AI required: curated + templated (fast, free, offline-friendly).
 */

import type { Locale } from "@/lib/i18n";

const EN = [
  "caught in 4K",
  "no thoughts just vibes",
  "main character energy",
  "send this to the group chat",
  "proof I went outside",
  "do not screenshot (jk)",
  "soft launch",
  "hard launch",
  "monday mood",
  "weekend unlocked",
  "low battery high drama",
  "touch grass speedrun",
];

const FR = [
  "pris en 4K",
  "zéro pensée, full vibe",
  "énergie personnage principal",
  "envoie ça dans le group chat",
  "preuve que j'suis sorti",
  "screenshot pas (jk)",
  "soft launch",
  "hard launch",
  "mood de lundi",
  "fin de semaine unlocked",
  "batterie low, drama high",
  "touche du gazon speedrun",
];

const QC = [
  "icitte c'est fire 🔥",
  "tabarnouche que c'est beau",
  "en train de chill solid",
  "MTL / QC check",
  "poutine later, snap now",
  "froid dehors, warm dans le snap",
  "gang d'icitte only",
  "ti-guy approves",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function suggestCaptions(locale: Locale, count = 6): string[] {
  const base = locale === "fr" ? [...FR, ...QC] : [...EN, ...QC];
  return shuffle(base).slice(0, count);
}

export function captionForTime(locale: Locale): string {
  const h = new Date().getHours();
  if (locale === "fr") {
    if (h < 6) return "trop tard ou trop tôt 🌙";
    if (h < 12) return "bonjour la gang ☀️";
    if (h < 17) return "après-midi vibes";
    if (h < 22) return "soirée mode on";
    return "nuit blanche energy";
  }
  if (h < 6) return "too late or too early 🌙";
  if (h < 12) return "good morning crew ☀️";
  if (h < 17) return "afternoon vibes";
  if (h < 22) return "evening mode on";
  return "night owl energy";
}
