import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

async function translateWithGemini(texts: string[], targetLang: string, mode: "general" | "recipe") {
  const model = "gemini-1.5-flash";
  const promptHeader = mode === "recipe"
    ? `You are a professional culinary translator. Translate the following content to ${targetLang === 'sv' ? 'Swedish (sv-SE)' : 'English (en-US)'}.
- Preserve any measurement numbers and units exactly as they appear (e.g., dl, msk, tsk, g, kg, ml, l).
- Maintain cooking terminology and keep list formatting natural.
Return only the translations in JSON array order.`
    : `Translate to ${targetLang === 'sv' ? 'Swedish (sv-SE)' : 'English (en-US)'} in a natural tone. Return only translations in JSON array.`;

  const content = [
    { role: "user", parts: [{ text: `${promptHeader}\n\nJSON to translate (array of strings):\n${JSON.stringify(texts)}` }] },
  ];

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: content }),
  });

  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Gemini error: ${resp.status} ${msg}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
  if (!text) return texts;
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json.map((x) => (typeof x === "string" ? x : String(x)));
  } catch (_) {
    // try to extract JSON array
    const m = text.match(/\[[\s\S]*\]/);
    if (m) {
      try {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr)) return arr.map((x) => (typeof x === "string" ? x : String(x)));
      } catch {}
    }
  }
  return texts;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { texts, targetLang, mode } = await req.json();
    if (!Array.isArray(texts) || !targetLang) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!GOOGLE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_AI_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const translations = await translateWithGemini(texts, targetLang, mode === "recipe" ? "recipe" : "general");
    return new Response(JSON.stringify({ translations }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("translate function error", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
