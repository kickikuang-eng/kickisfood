import { Language } from "@/contexts/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";

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
  if (!texts.length) return texts;

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
    const { data, error } = await supabase.functions.invoke("translate", {
      body: { texts: pending.map((p) => p.text), targetLang: lang, mode: opts?.mode || "general" },
    });
    if (error) throw error;
    const translated = Array.isArray((data as any)?.translations)
      ? ((data as any).translations as string[])
      : pending.map((p) => p.text);
    pending.forEach((p, i) => {
      const out = translated[i] ?? p.text;
      results[p.index] = out;
      localStorage.setItem(cacheKey(lang, p.text, opts?.hint), out);
    });
  } catch (e) {
    // Fallback to originals on error
    pending.forEach((p) => {
      results[p.index] = p.text;
    });
  }

  return results;
}

export async function translateText(text: string, lang: Language, opts?: { mode?: "general" | "recipe"; hint?: string }): Promise<string> {
  const [t] = await translateTexts([text], lang, opts);
  return t;
}
