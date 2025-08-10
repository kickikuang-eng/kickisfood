import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExtractResponse = {
  success: boolean;
  recipe?: any;
  error?: string;
};

function extractPlatform(url: string): "youtube" | "tiktok" | "instagram" | "unknown" {
  if (/youtube\.com\/(watch\?v=|embed\/)||youtu\.be\//.test(url)) return "youtube";
  if (/tiktok\.com\//.test(url)) return "tiktok";
  if (/instagram\.com\//.test(url)) return "instagram";
  return "unknown";
}

function parseOgImageFromHtml(html?: string | null): string | null {
  if (!html) return null;
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);
  return match ? match[1] : null;
}

async function scrapeWithFirecrawl(targetUrl: string): Promise<{ markdown?: string; html?: string; finalUrl?: string; }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");

  // Prefer single-page scrape
  const scrapeEndpoint = "https://api.firecrawl.dev/v1/scrape";
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const body = JSON.stringify({ url: targetUrl, formats: ["markdown", "html"] });
  let res = await fetch(scrapeEndpoint, { method: "POST", headers, body });

  if (!res.ok) {
    // Fallback to crawl with limit 1
    const crawlEndpoint = "https://api.firecrawl.dev/v1/crawl";
    res = await fetch(crawlEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: targetUrl, limit: 1, scrapeOptions: { formats: ["markdown", "html"] } }),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl error: ${res.status} ${text}`);
  }

  const data = await res.json();
  // Normalize potential shapes
  // Possible shapes: { success, data: { markdown, html, ... } } OR { success, data: [{ markdown, html }]} OR direct fields
  const first = data?.data?.markdown || data?.markdown ? data.data || data : (Array.isArray(data?.data) ? data.data[0] : null);
  const markdown = first?.markdown || data?.markdown || null;
  const html = first?.html || data?.html || null;
  const finalUrl = first?.metadata?.url || data?.metadata?.url || targetUrl;
  return { markdown: markdown || undefined, html: html || undefined, finalUrl };
}

function buildPrompt(sourceUrl: string, platform: string, scrapedMarkdown?: string, scrapedHtml?: string) {
  return `You are an expert recipe extractor. Given the user's social video URL and the scraped page content, extract a clean, structured recipe.
- Prefer explicit ingredient quantities and ordered steps.
- If you are uncertain, leave fields null rather than inventing data.
- Output STRICT JSON only, no code fences, no prose.

Fields:
{
  "title": string,                   // recipe title
  "description": string|null,        // short description from caption if helpful
  "ingredients": string[],           // list of ingredients
  "instructions": string[],          // numbered steps
  "servings": number|null,           // integer if known
  "prep_time_minutes": number|null,  // integer minutes
  "cook_time_minutes": number|null,  // integer minutes
  "cuisine": string|null,            // optional e.g. Mexican
  "difficulty": string|null,         // optional e.g. Easy/Medium/Hard
  "image_url": string|null           // publicly accessible image URL for the dish if available
}

Source URL (${platform}): ${sourceUrl}

Scraped markdown:\n${scrapedMarkdown ?? ""}

(HTML excerpt may include OG tags)\n${(scrapedHtml ?? "").slice(0, 3000)}
`;
}

async function analyzeWithGemini(prompt: string): Promise<any> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [ { role: "user", parts: [ { text: prompt } ] } ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJsonFromText(text);
}

function parseJsonFromText(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    throw new Error("Failed to parse JSON from model response");
  }
}

function normalizeRecipe(raw: any, fallbackImage?: string | null) {
  const toInt = (v: any) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  };
  const ingredients = Array.isArray(raw?.ingredients) ? raw.ingredients.map((x: any) => String(x).trim()).filter(Boolean) : [];
  const instructions = Array.isArray(raw?.instructions) ? raw.instructions.map((x: any) => String(x).trim()).filter(Boolean) : [];

  const prep = toInt(raw?.prep_time_minutes);
  const cook = toInt(raw?.cook_time_minutes ?? raw?.total_time_minutes);

  return {
    title: String(raw?.title || "Untitled Recipe").trim(),
    description: raw?.description ? String(raw.description).trim() : null,
    ingredients,
    instructions,
    servings: toInt(raw?.servings),
    prep_time: prep,
    cook_time: cook,
    image_url: raw?.image_url || fallbackImage || null,
    cuisine: raw?.cuisine ? String(raw.cuisine) : null,
    difficulty: raw?.difficulty ? String(raw.difficulty) : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, userId } = await req.json();

    if (!videoUrl || !userId) {
      return new Response(JSON.stringify({ success: false, error: "videoUrl and userId are required" } satisfies ExtractResponse), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platform = extractPlatform(videoUrl);

    // Init Supabase client with the caller's auth for RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Scrape
    const scraped = await scrapeWithFirecrawl(videoUrl);
    const ogImage = parseOgImageFromHtml(scraped.html);

    // Analyze
    const prompt = buildPrompt(videoUrl, platform, scraped.markdown, scraped.html);
    const raw = await analyzeWithGemini(prompt);
    const normalized = normalizeRecipe(raw, ogImage);

    // Insert
    const insertPayload = {
      user_id: userId,
      title: normalized.title,
      description: normalized.description,
      ingredients: normalized.ingredients,
      instructions: normalized.instructions,
      prep_time: normalized.prep_time,
      cook_time: normalized.cook_time,
      servings: normalized.servings,
      image_url: normalized.image_url,
      source_url: videoUrl,
      cuisine: normalized.cuisine,
      difficulty: normalized.difficulty,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("recipes")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error", insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message } satisfies ExtractResponse), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, recipe: inserted } satisfies ExtractResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extract-recipe-from-social error", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Unexpected error" } satisfies ExtractResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
