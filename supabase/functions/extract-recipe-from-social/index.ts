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
  const u = url.toLowerCase();
  if (/youtu\.be\//i.test(u) || /youtube\.com\/(watch\?v=|embed\/|shorts\/)\/?.*/i.test(u)) return "youtube";
  if (/tiktok\.com\//i.test(u)) return "tiktok";
  if (/instagram\.com\//i.test(u)) return "instagram";
  return "unknown";
}

function parseOgImageFromHtml(html?: string | null): string | null {
  if (!html) return null;
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);
  return match ? match[1] : null;
}

function extractInstagramInfo(url: string): { username: string | null; postId: string | null } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com")) return null;
    
    const path = u.pathname;
    const segments = path.split("/").filter(Boolean);
    
    if (segments.length >= 2) {
      const username = segments[0];
      const postType = segments[1]; // 'reel' or 'p'
      const postId = segments[2] || null;
      
      if (username && (postType === 'reel' || postType === 'p')) {
        return { username, postId };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

function extractTikTokInfo(url: string): { username: string | null; videoId: string | null } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("tiktok.com")) return null;
    
    const path = u.pathname;
    
    // Match patterns like /@username/video/12345 or /t/abc123
    const videoMatch = path.match(/\/@([^\/]+)\/video\/(\d+)/);
    if (videoMatch) {
      return { username: videoMatch[1], videoId: videoMatch[2] };
    }
    
    const shortMatch = path.match(/\/t\/([^\/]+)/);
    if (shortMatch) {
      return { username: null, videoId: shortMatch[1] };
    }
    
    return null;
  } catch {
    return null;
  }
}

function extractAuthorFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const path = u.pathname;

    // TikTok: /@username/video/12345
    if (host.includes("tiktok.com")) {
      const m = path.match(/\/(@[\w.-]+)\/video\//);
      if (m) return m[1];
    }

    // Instagram: /username/reel/{id} or /username/p/{id}
    if (host.includes("instagram.com")) {
      const m = path.match(/^\/([^\/?#]+)\/(reel|p)\//);
      if (m && m[1] && !["reel", "p"].includes(m[1])) return m[1];
    }

    // YouTube: /@channelHandle/..., /c/Name, /channel/...
    if (host.includes("youtube.com")) {
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
  const platformSpecific = platform === "instagram" 
    ? "For Instagram content, focus on the caption text and any visible ingredients or cooking steps. Instagram often has detailed captions with recipe information."
    : platform === "tiktok" 
    ? "For TikTok content, look for recipe details in the description, comments, or any visible text. TikTok recipes are often concise but can be reconstructed."
    : "Extract recipe information from the available content.";

  return `You are an expert recipe extractor. Given the user's social video URL and the scraped page content, extract a clean, structured recipe.

${platformSpecific}

Guidelines:
- Prefer explicit ingredient quantities and ordered steps
- If you are uncertain about specific details, make reasonable culinary assumptions
- For ${platform} content, be creative but realistic with recipe reconstruction
- Output STRICT JSON only, no code fences, no prose

Fields:
{
  "title": string,                   // creative recipe title based on content
  "description": string|null,        // short description from caption or inferred
  "ingredients": string[],           // list of ingredients (be specific with quantities)
  "instructions": string[],          // numbered cooking steps
  "servings": number|null,           // integer if known, otherwise estimate (2-6)
  "prep_time_minutes": number|null,  // integer minutes (estimate if needed)
  "cook_time_minutes": number|null,  // integer minutes (estimate if needed)
  "cuisine": string|null,            // optional e.g. Mexican, Italian, Asian
  "difficulty": string|null,         // Easy/Medium/Hard based on complexity
  "image_url": string|null,          // publicly accessible image URL if available
  "chef": string|null                // creator/channel/handle if available
}

Source URL (${platform}): ${sourceUrl}

Scraped markdown:\n${scrapedMarkdown ?? ""}

(HTML excerpt may include OG tags)\n${(scrapedHtml ?? "").slice(0, 3000)}

If the content is limited, create a reasonable recipe based on common cooking knowledge and the platform context.`;
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

function normalizeRecipe(raw: any, fallbackImage?: string | null, authorFromUrl?: string | null) {
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
    chef: raw?.chef ? String(raw.chef).trim() : (authorFromUrl || null),
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

    console.log("extract-recipe-from-social start", { videoUrl, userId });

    const platform = extractPlatform(videoUrl);
    console.log("detected platform", platform);

    // Init Supabase client with the caller's auth for RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Scrape or fallback (Instagram oEmbed)
    let scraped: { markdown?: string; html?: string; finalUrl?: string } | null = null;
    let ogImage: string | null = null;
    let igOembed: any | null = null;

    if (platform === "instagram") {
      try {
        const appId = Deno.env.get("FB_APP_ID");
        const clientToken = Deno.env.get("FB_CLIENT_TOKEN");
        
        if (appId && clientToken) {
          console.log("Attempting Instagram oEmbed with Facebook App credentials...");
          
          // Use app access token format: {app-id}|{client-token}
          const accessToken = `${appId}|${clientToken}`;
          const oembedUrl = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(videoUrl)}&access_token=${accessToken}&omitscript=true`;
          
          console.log("Instagram oEmbed URL:", oembedUrl);
          
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000); // Increased timeout
          
          const oRes = await fetch(oembedUrl, {
            signal: controller.signal,
            headers: {
              "Accept": "application/json",
              "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0; +https://lovable.dev)"
            }
          });
          
          clearTimeout(timer);
          
          if (oRes.ok) {
            igOembed = await oRes.json();
            console.log("Instagram oEmbed response:", igOembed);
            ogImage = igOembed?.thumbnail_url || null;
            
            if (ogImage) {
              console.log("Found Instagram thumbnail:", ogImage);
            }
          } else {
            const txt = await oRes.text();
            console.warn("Instagram oEmbed request failed", oRes.status, txt);
            
            // Try alternative approach for public Instagram posts
            if (oRes.status === 400 || oRes.status === 403) {
              console.log("Trying alternative Instagram scraping approach...");
              try {
                // Try to get basic info from the URL structure
                const urlInfo = extractInstagramInfo(videoUrl);
                if (urlInfo) {
                  igOembed = {
                    title: `Instagram Recipe from ${urlInfo.username || 'unknown user'}`,
                    author_name: urlInfo.username || 'Instagram User',
                    thumbnail_url: null
                  };
                  console.log("Created fallback Instagram info:", igOembed);
                }
              } catch (fallbackError) {
                console.warn("Instagram fallback also failed:", fallbackError);
              }
            }
          }
        } else {
          console.warn("FB_APP_ID and FB_CLIENT_TOKEN not set; skipping Instagram oEmbed.");
        }
      } catch (e) {
        console.warn("Instagram oEmbed fetch error:", e);
      }
    }

    // Attempt scraping
    if (platform === "instagram") {
      try {
        console.log("Attempting Instagram scraping with Firecrawl...");
        scraped = await scrapeWithFirecrawl(videoUrl);
        ogImage = parseOgImageFromHtml(scraped.html);
        console.log("Instagram scraping successful");
      } catch (e) {
        console.warn("Instagram scraping failed (may be 403). Will fallback to oEmbed/placeholder if available:", e);
      }
    } else if (platform === "tiktok") {
      try {
        console.log("Attempting TikTok scraping with Firecrawl...");
        scraped = await scrapeWithFirecrawl(videoUrl);
        ogImage = parseOgImageFromHtml(scraped.html);
        console.log("TikTok scraping successful");
      } catch (e) {
        console.warn("TikTok scraping failed, using fallback approach:", e);
        // Create fallback TikTok info
        const urlInfo = extractTikTokInfo(videoUrl);
        if (urlInfo) {
          igOembed = {
            title: `TikTok Recipe from ${urlInfo.username || 'unknown user'}`,
            author_name: urlInfo.username || 'TikTok User',
            thumbnail_url: null
          };
          console.log("Created fallback TikTok info:", igOembed);
        }
      }
    } else {
      try {
        scraped = await scrapeWithFirecrawl(videoUrl);
        ogImage = parseOgImageFromHtml(scraped.html);
      } catch (e) {
        // Non-Instagram/TikTok URLs should surface scrape errors
        throw e;
      }
    }

    // Analysis & insert
    if (platform === "instagram") {
      if (scraped?.markdown || scraped?.html) {
        // We have real content -> use AI extraction
        const prompt = buildPrompt(videoUrl, platform, scraped.markdown, scraped.html);
        const raw = await analyzeWithGemini(prompt);
        const authorFromUrl = (igOembed?.author_name as string | undefined) || extractAuthorFromUrl(videoUrl);
        const normalized = normalizeRecipe(raw, ogImage, authorFromUrl);

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
          chef: normalized.chef,
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
      }

      // No scraped content -> if we have basic oEmbed, create a clear placeholder entry
      if (igOembed) {
        const caption: string = igOembed?.title || "";
        const authorName: string | null = igOembed?.author_name || extractAuthorFromUrl(videoUrl) || null;

        const insertPayload = {
          user_id: userId,
          title: "Recipe from Instagram Video - Manual Review Needed",
          description: caption || null,
          ingredients: [] as string[],
          instructions: [] as string[],
          prep_time: null as number | null,
          cook_time: null as number | null,
          servings: null as number | null,
          image_url: ogImage || null,
          source_url: videoUrl,
          cuisine: null as string | null,
          difficulty: null as string | null,
          chef: authorName,
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
      }

      // Nothing worked
      return new Response(
        JSON.stringify({ success: false, error: "Instagram parsing failed. Please ensure the post is public or try again later." } satisfies ExtractResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Non-Instagram: use AI extraction
    let prompt: string;
    if (igOembed) {
      const caption = igOembed?.title || "";
      const authorName = igOembed?.author_name || extractAuthorFromUrl(videoUrl) || "";
      const md = `Social oEmbed\nCaption: ${caption}\nAuthor: ${authorName}\nThumbnail: ${ogImage || ""}`;
      prompt = buildPrompt(videoUrl, platform, md, undefined);
    } else {
      prompt = buildPrompt(videoUrl, platform, scraped?.markdown, scraped?.html);
    }
    const raw = await analyzeWithGemini(prompt);
    const authorFromUrl = (igOembed?.author_name as string | undefined) || extractAuthorFromUrl(videoUrl);
    const normalized = normalizeRecipe(raw, ogImage, authorFromUrl);

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
      chef: normalized.chef,
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
