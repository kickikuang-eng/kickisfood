import { Language } from "@/contexts/LanguageProvider";

const CACHE_PREFIX = "i18n_cache_v1";

function cacheKey(lang: Language, text: string, hint?: string) {
  const key = `${lang}::${hint || ""}::${text}`;
  return `${CACHE_PREFIX}:${key}`;
}

export async function translateTexts(
  texts: string[],
  lang: Language,
  opts?: { mode?: "general" | "recipe"; hint?: string }
): Promise<string[]> {
  if (lang === "en") return texts; // no-op

  const results: string[] = [];
  const pending: { index: number; text: string }[] = [];

  // Pull from localStorage cache when possible
  texts.forEach((t, idx) => {
    const k = cacheKey(lang, t, opts?.hint);
    const cached = localStorage.getItem(k);
    if (cached) results[idx] = cached;
    else pending.push({ index: idx, text: t });
  });

  if (pending.length === 0) return results.length ? results : texts;

  try {
    const res = await fetch("/functions/v1/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: pending.map((p) => p.text), targetLang: lang, mode: opts?.mode || "general" }),
    });
    const data = await res.json();
    const translated = Array.isArray(data?.translations) ? data.translations as string[] : pending.map((p) => p.text);
    pending.forEach((p, i) => {
      const out = translated[i] ?? p.text;
      results[p.index] = out;
      localStorage.setItem(cacheKey(lang, p.text, opts?.hint), out);
    });
  } catch (e) {
    // Fallback to originals on error
    pending.forEach((p) => { results[p.index] = p.text; });
  }

  return results;
}

export async function translateText(text: string, lang: Language, opts?: { mode?: "general" | "recipe"; hint?: string }): Promise<string> {
  const [t] = await translateTexts([text], lang, opts);
  return t;
}
