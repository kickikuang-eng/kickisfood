import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GEMINI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars in Edge Function context.");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

function extractVideoInfo(url: string): { platform: string; id: string | null } {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return { platform: "youtube", id };
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/")[1] || null;
      return { platform: "youtube", id };
    }
    // TikTok
    if (u.hostname.includes("tiktok.com")) {
      const m = u.pathname.match(/video\/(\d+)/);
      return { platform: "tiktok", id: m?.[1] || null };
    }
    // Instagram
    if (u.hostname.includes("instagram.com")) {
      const seg = u.pathname.split("/").filter(Boolean);
      const id = seg[1] || null; // reel/{id} or p/{id}
      return { platform: "instagram", id };
    }
  } catch (_) {}
  return { platform: "unknown", id: null };
}

function getVideoThumbnail(info: { platform: string; id: string | null }): string | null {
  if (info.platform === "youtube" && info.id) {
    return `https://img.youtube.com/vi/${info.id}/hqdefault.jpg`;
  }
  // For TikTok/Instagram we don't have a stable public thumbnail. Return null to rely on text-only prompt.
  return null;
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ab = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
    return { base64, mime: contentType };
  } catch (e) {
    console.warn("Failed to fetch thumbnail:", e);
    return null;
  }
}

function buildPrompt(videoUrl: string) {
  return `You are a culinary assistant. Analyze the provided content (image snapshot if present and the described video URL) to extract a well-structured cooking recipe.
Return STRICT JSON only with these fields:
{
  "title": string,
  "description": string,
  "ingredients": string[],
  "instructions": string[],
  "prep_time_minutes": number | null,
  "cook_time_minutes": number | null,
  "servings": number | null,
  "cuisine": string | null,
  "difficulty": "easy" | "medium" | "hard" | null
}
Guidelines:
- If details are unclear, infer reasonable defaults.
- Ingredients: concise items with amounts when visible.
- Instructions: numbered, imperative steps.
- Keep it simple and realistic.
Video URL context: ${videoUrl}`;
}

async function analyzeWithGemini(params: {
  videoUrl: string;
  thumbnailBase64?: { base64: string; mime: string } | null;
}): Promise<any> {
  const model = "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const parts: any[] = [{ text: buildPrompt(params.videoUrl) }];
  if (params.thumbnailBase64) {
    parts.push({ inline_data: { mime_type: params.thumbnailBase64.mime, data: params.thumbnailBase64.base64 } });
  }

  const body = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data;
}

function parseJsonFromText(text: string): any | null {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (_) {
    // Extract JSON block with regex
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

function normalizeRecipe(raw: any) {
  const recipe = {
    title: String(raw?.title || "Untitled Recipe"),
    description: String(raw?.description || ""),
    ingredients: Array.isArray(raw?.ingredients) ? raw.ingredients.map((i: any) => String(i)).slice(0, 50) : [],
    instructions: Array.isArray(raw?.instructions) ? raw.instructions.map((s: any) => String(s)).slice(0, 100) : [],
    prep_time_minutes: raw?.prep_time_minutes != null ? Number(raw.prep_time_minutes) : null,
    cook_time_minutes: raw?.cook_time_minutes != null ? Number(raw.cook_time_minutes) : null,
    servings: raw?.servings != null ? Number(raw.servings) : null,
    cuisine: raw?.cuisine != null ? String(raw.cuisine) : null,
    difficulty: raw?.difficulty != null ? String(raw.difficulty) : null,
  };
  return recipe;
}

function extractAuthorFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const path = u.pathname;

    if (host.includes('tiktok.com')) {
      const m = path.match(/\/@[\w.-]+/);
      if (m) return m[0];
    }

    if (host.includes('instagram.com')) {
      const seg = path.split('/').filter(Boolean);
      if (seg.length > 0 && !['reel', 'p'].includes(seg[0])) return seg[0];
    }

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const mHandle = path.match(/\/(@[^\/?#]+)/);
      if (mHandle) return mHandle[1];
      const mC = path.match(/\/c\/([^\/?#]+)/);
      if (mC) return mC[1];
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchYouTubeAuthor(videoUrl: string): Promise<string | null> {
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const res = await fetch(oembed);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.author_name === 'string' ? data.author_name : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "GOOGLE_AI_API_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoUrl, userId } = await req.json();
    if (!videoUrl || !userId) {
      return new Response(JSON.stringify({ success: false, error: "Missing videoUrl or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const info = extractVideoInfo(videoUrl);
    const thumbnailUrl = getVideoThumbnail(info);
    const thumbBase64 = thumbnailUrl ? await fetchImageAsBase64(thumbnailUrl) : null;

    const ai = await analyzeWithGemini({ videoUrl, thumbnailBase64: thumbBase64 });

    let text = "";
    try {
      text = ai.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (_) {}

    let parsed = parseJsonFromText(text);
    if (!parsed) {
      // Fallback very basic recipe
      parsed = {
        title: "AI Extracted Recipe",
        description: "A recipe extracted from the provided video.",
        ingredients: ["1 tbsp oil", "Salt to taste"],
        instructions: ["Prepare ingredients", "Cook and serve"],
        prep_time_minutes: null,
        cook_time_minutes: null,
        servings: null,
        cuisine: null,
        difficulty: null,
      };
    }

    const recipe = normalizeRecipe(parsed);

    // Derive chef/author from URL where possible
    const derivedChef = extractAuthorFromUrl(videoUrl) || (info.platform === 'youtube' ? await fetchYouTubeAuthor(videoUrl) : null);

    // Insert into database
    const insertPayload: any = {
      user_id: userId,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      image_url: thumbnailUrl || null,
      source_url: videoUrl,
      prep_time: recipe.prep_time_minutes, // map minutes -> prep_time column
      cook_time: recipe.cook_time_minutes, // map minutes -> cook_time column
      servings: recipe.servings,
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty,
      chef: derivedChef || null,
    };

    const { data: inserted, error: dbError } = await supabase
      .from("recipes")
      .insert(insertPayload)
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(JSON.stringify({ success: false, error: dbError.message, recipe }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, recipe: inserted || recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("extract-recipe-with-gemini error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
