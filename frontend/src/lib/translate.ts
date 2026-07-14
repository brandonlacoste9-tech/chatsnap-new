/**
 * Free bilingual translate (EN ↔ FR) via MyMemory public API.
 * Better-than-Snap for Québec/bilingual crews — no Snap translate.
 */

export type Lang = "en" | "fr";

function detectLang(text: string): Lang {
  // crude: if many French diacritics / common words → fr
  const frHints =
    /[àâäéèêëïîôùûüçœ]|(\b(le|la|les|des|une|est|pour|avec|dans|sur|bonjour|salut|merci)\b)/i;
  return frHints.test(text) ? "fr" : "en";
}

export async function translateText(
  text: string,
  to?: Lang,
): Promise<{ text: string; from: Lang; to: Lang } | null> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) return null;

  const from = detectLang(trimmed);
  const target = to ?? (from === "en" ? "fr" : "en");
  if (from === target) return { text: trimmed, from, to: target };

  const langpair = `${from}|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${langpair}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const out = json.responseData?.translatedText?.trim();
    if (!out || out.toUpperCase().includes("MYMEMORY")) return null;
    return { text: out, from, to: target };
  } catch {
    return null;
  }
}
