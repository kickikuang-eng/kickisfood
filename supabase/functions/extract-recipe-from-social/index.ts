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
    
    // Handle different Instagram URL patterns
    if (segments.length >= 2) {
      // Pattern: /p/{postId} or /reel/{postId}
      if (segments[0] === 'p' || segments[0] === 'reel') {
        const postId = segments[1];
        return { username: null, postId };
      }
      
      // Pattern: /{username}/p/{postId} or /{username}/reel/{postId}
      if (segments.length >= 3) {
        const username = segments[0];
        const postType = segments[1];
        const postId = segments[2];
        
        if ((postType === 'p' || postType === 'reel') && username && !['p', 'reel'].includes(username)) {
          return { username, postId };
        }
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

async function scrapeWithApify(url: string, platform: 'instagram' | 'tiktok'): Promise<{ caption?: string; author?: string; thumbnailUrl?: string; }> {
  const apiToken = Deno.env.get("APIFY_API_TOKEN");
  if (!apiToken) throw new Error("APIFY_API_TOKEN is not set");

  try {
    console.log(`Starting Apify ${platform} scraping for:`, url);
    
    let actorId: string;
    let payload: any;
    
    if (platform === 'instagram') {
      const instagramInfo = extractInstagramInfo(url);
      const isVideoContent = url.includes('/reel/') || url.includes('/tv/');
      
      console.log("Instagram URL analysis:", { 
        url, 
        instagramInfo, 
        isVideoContent,
        segments: url.split('/').filter(Boolean)
      });
      
      if (isVideoContent) {
        // Use video scraper for reels/videos
        actorId = "presetshubham~instagram-reel-downloader";
        payload = {
          reelLinks: [url],
          username: instagramInfo?.username || "unknown",
          proxy: "none"
        };
        console.log("Using video scraper with payload:", payload);
      } else {
        // Use image scraper for posts
        actorId = "apify/instagram-scraper";
        payload = {
          directUrls: [url],
          resultsLimit: 1,
          addParentData: false
        };
        console.log("Using image scraper with payload:", payload);
      }
    } else if (platform === 'tiktok') {
      actorId = "clockworks~free-tiktok-scraper";
      payload = {
        postURLs: [url],
        resultsLimit: 1
      };
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    // Start the actor run
    const actorRunResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!actorRunResponse.ok) {
      const errorText = await actorRunResponse.text();
      throw new Error(`Apify actor start failed: ${actorRunResponse.status} ${errorText}`);
    }

    const runData = await actorRunResponse.json();
    const runId = runData.data.id;
    console.log("Apify run started with ID:", runId);

    // Wait for the run to complete (with timeout)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { "Authorization": `Bearer ${apiToken}` }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${statusResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      const status = statusData.data.status;
      
      console.log(`Apify run status (attempt ${attempts + 1}):`, status);
      
      if (status === "SUCCEEDED") {
        // Get the results
        const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${statusData.data.defaultDatasetId}/items`, {
          headers: { "Authorization": `Bearer ${apiToken}` }
        });
        
        if (!resultsResponse.ok) {
          throw new Error(`Failed to get results: ${resultsResponse.status}`);
        }
        
        const results = await resultsResponse.json();
        console.log("Apify results:", results);
        
        if (results && results.length > 0) {
          const result = results[0];
          
          if (platform === 'instagram') {
            // Log the full result to see what fields are available
            console.log("Instagram Apify result fields:", Object.keys(result));
            console.log("Instagram Apify result:", JSON.stringify(result, null, 2));
            
            return {
              caption: result.caption || result.description || result.text || null,
              author: result.owner_username || result.owner || result.username || result.author || null,
              thumbnailUrl: result.thumbnail || result.cover || result.display_url || result.image_url || result.url || result.media_url || null
            };
          } else if (platform === 'tiktok') {
            return {
              caption: result.text || result.description || result.caption || null,
              author: result.authorMeta?.name || result.author?.uniqueId || result.username || null,
              thumbnailUrl: result.covers?.[0] || result.thumbnail || result.cover || null
            };
          }
        }
        
        return {};
      } else if (status === "FAILED") {
        throw new Error("Apify run failed");
      }
      
      attempts++;
    }
    
    throw new Error("Apify run timeout");
  } catch (error) {
    console.error("Apify scraping error:", error);
    throw error;
  }
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

    // Social media scraping with Apify
    let apifyData: { caption?: string; author?: string; thumbnailUrl?: string; } | null = null;

    if (platform === "instagram") {
      try {
        console.log("Attempting Instagram scraping with Apify...");
        apifyData = await scrapeWithApify(videoUrl, 'instagram');
        console.log("Apify scraping successful:", apifyData);
      } catch (e) {
        console.error("Apify Instagram scraping failed. Error details:", e);
        // Create fallback info for Instagram when scraping fails
        const urlInfo = extractInstagramInfo(videoUrl);
        if (urlInfo) {
          apifyData = {
            caption: `Instagram Recipe from ${urlInfo.username || 'Instagram User'}`,
            author: urlInfo.username || 'Instagram User',
            thumbnailUrl: null
          };
          console.log("Created fallback Instagram info from URL structure:", apifyData);
        } else {
          throw new Error(`Instagram parsing failed. Please ensure the post is public or try again later. Error: ${e.message}`);
        }
      }
    } else if (platform === "tiktok") {
      try {
        console.log("Attempting TikTok scraping with Apify...");
        apifyData = await scrapeWithApify(videoUrl, 'tiktok');
        console.log("Apify scraping successful:", apifyData);
      } catch (e) {
        console.warn("Apify TikTok scraping failed. Error details:", e);
        // Create fallback info for TikTok when scraping fails
        const urlInfo = extractTikTokInfo(videoUrl);
        if (urlInfo) {
          apifyData = {
            caption: `TikTok Recipe from ${urlInfo.username || 'TikTok User'}`,
            author: urlInfo.username || 'TikTok User',
            thumbnailUrl: null
          };
          console.log("Created fallback TikTok info from URL structure:", apifyData);
        }
      }
    } else {
      // For other platforms
      if (platform === "youtube") {
        throw new Error(`${platform} is not supported yet. Please use Instagram reels or TikTok videos.`);
      } else {
        throw new Error("Unsupported platform. Please use Instagram reels or TikTok videos.");
      }
    }

    // Analysis & insert for Instagram and TikTok
    if ((platform === "instagram" || platform === "tiktok") && apifyData) {
      // Build content for AI analysis
      const content = `${platform === 'instagram' ? 'Instagram' : 'TikTok'} Caption: ${apifyData.caption || ""}
Author: ${apifyData.author || ""}`;
      
      const prompt = buildPrompt(videoUrl, platform, content, undefined);
      const raw = await analyzeWithGemini(prompt);
      const normalized = normalizeRecipe(raw, apifyData.thumbnailUrl, apifyData.author);

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

    // If we have fallback data but no proper scraping
    if ((platform === "instagram" || platform === "tiktok") && apifyData && apifyData.caption && (apifyData.caption.includes("Instagram Recipe from") || apifyData.caption.includes("TikTok Recipe from"))) {
      const insertPayload = {
        user_id: userId,
        title: `Recipe from ${platform === 'instagram' ? 'Instagram' : 'TikTok'} Video - Manual Review Needed`,
        description: apifyData.caption || null,
        ingredients: [] as string[],
        instructions: [] as string[],
        prep_time: null as number | null,
        cook_time: null as number | null,
        servings: null as number | null,
        image_url: apifyData.thumbnailUrl || null,
        source_url: videoUrl,
        cuisine: null as string | null,
        difficulty: null as string | null,
        chef: apifyData.author,
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
      JSON.stringify({ success: false, error: `${platform === 'instagram' ? 'Instagram' : 'TikTok'} parsing failed. Please ensure the post is public or try again later.` } satisfies ExtractResponse),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("extract-recipe-from-social error", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Unexpected error" } satisfies ExtractResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
