import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, userId } = await req.json();
    console.log('Processing video URL:', videoUrl);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Extract video ID and platform info
    const videoInfo = extractVideoInfo(videoUrl);
    if (!videoInfo) {
      throw new Error('Unsupported video platform or invalid URL');
    }

    console.log('Video info extracted:', videoInfo);

    // Get video thumbnail/frames for analysis
    const imageUrl = getVideoThumbnail(videoInfo);
    console.log('Using image URL for analysis:', imageUrl);

    // Analyze the image/video with OpenAI Vision
    const recipeData = await analyzeVideoForRecipe(imageUrl, videoUrl);
    console.log('Recipe analysis completed:', recipeData);

// Save to Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const chef = extractAuthorFromUrl(videoUrl);

const { data: recipe, error } = await supabase
  .from('recipes')
  .insert({
    user_id: userId,
    title: recipeData.title,
    description: recipeData.description,
    ingredients: recipeData.ingredients,
    instructions: recipeData.instructions,
    prep_time: recipeData.prep_time,
    cook_time: recipeData.cook_time,
    servings: recipeData.servings,
    difficulty: recipeData.difficulty,
    cuisine: recipeData.cuisine,
    source_url: videoUrl,
    image_url: imageUrl,
    chef: chef || null,
  })
  .select()
  .single();

    if (error) {
      console.error('Error saving recipe:', error);
      throw new Error('Failed to save recipe to database');
    }

    console.log('Recipe saved successfully:', recipe);

    return new Response(JSON.stringify({ 
      success: true, 
      recipe: recipe,
      message: 'Recipe extracted and saved successfully!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in extract-recipe-from-video function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to extract recipe from video',
      success: false 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractVideoInfo(url: string) {
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(watch\?v=|embed\/)||youtu\.be\/)([^&\n?#]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { platform: 'youtube', id: youtubeMatch[2] || youtubeMatch[1] } as any;
  }
  // YouTube Shorts
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^&\n?#]+)/);
  if (shortsMatch) {
    return { platform: 'youtube', id: shortsMatch[1] };
  }

  // TikTok
  const tiktokRegex = /tiktok\.com\/@[\w.-]+\/video\/(\d+)|tiktok\.com\/t\/(\w+)/;
  const tiktokMatch = url.match(tiktokRegex);
  if (tiktokMatch) {
    return { platform: 'tiktok', id: tiktokMatch[1] || tiktokMatch[2] };
  }

  // Instagram
  const instaRegex = /instagram\.com\/(?:p|reel)\/([^\/\?]+)/;
  const instaMatch = url.match(instaRegex);
  if (instaMatch) {
    return { platform: 'instagram', id: instaMatch[1] };
  }

  return null;
}

function extractAuthorFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const path = u.pathname;

    if (host.includes('tiktok.com')) {
      const m = path.match(/\/(@[\w.-]+)\/video\//);
      if (m) return m[1];
    }

    if (host.includes('instagram.com')) {
      const m = path.match(/^\/([^\/?#]+)\/(reel|p)\//);
      if (m && m[1] && !['reel', 'p'].includes(m[1])) return m[1];
    }

    if (host.includes('youtube.com')) {
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

function getVideoThumbnail(videoInfo: { platform: string; id: string }): string {
  switch (videoInfo.platform) {
    case 'youtube':
      return `https://img.youtube.com/vi/${videoInfo.id}/hqdefault.jpg`;
    case 'tiktok':
      // Try to get TikTok thumbnail - this may not always work due to TikTok's restrictions
      return `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@user/video/${videoInfo.id}`;
    case 'instagram':
      // For Instagram, we'll try a different approach using their oEmbed endpoint
      return `https://graph.instagram.com/oembed?url=https://www.instagram.com/p/${videoInfo.id}/&access_token=instagram_basic_display`;
    default:
      return `https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1024&h=1024&fit=crop&crop=center`;
  }
}

async function analyzeVideoForRecipe(imageUrl: string, videoUrl: string) {
  // For Instagram and TikTok, we need to inform the AI that we can't access the actual image
  const isActualImage = imageUrl.includes('img.youtube.com');
  
  const prompt = isActualImage 
    ? `Analyze this image from a cooking video and extract a complete recipe. Please provide:

1. Recipe title (creative and descriptive)
2. Brief description
3. List of ingredients with quantities
4. Step-by-step cooking instructions
5. Estimated prep time (in minutes)
6. Estimated cook time (in minutes)
7. Number of servings
8. Difficulty level (Easy, Medium, Hard)
9. Cuisine type (if identifiable)

Please format the response as JSON with these exact keys:
- title (string)
- description (string)
- ingredients (array of strings)
- instructions (array of strings)
- prep_time (number in minutes)
- cook_time (number in minutes)
- servings (number)
- difficulty (string: "Easy", "Medium", or "Hard")
- cuisine (string or null)

Be creative and detailed. If some information isn't visible, make reasonable assumptions based on what you can see.`
    : `I cannot access the actual thumbnail from this ${videoUrl.includes('instagram') ? 'Instagram' : 'TikTok'} video due to platform restrictions. 

Please generate a placeholder recipe that indicates this limitation. Create a recipe with the title "Recipe from ${videoUrl.includes('instagram') ? 'Instagram' : 'TikTok'} Video - Manual Review Needed" and include a note in the description explaining that the actual video content couldn't be analyzed.

Format the response as JSON with these exact keys:
- title (string)
- description (string)
- ingredients (array of strings)
- instructions (array of strings)
- prep_time (number in minutes)
- cook_time (number in minutes)
- servings (number)
- difficulty (string: "Easy", "Medium", or "Hard")
- cuisine (string or null)

Make it clear that this is a placeholder and the user should manually review and edit the recipe.`;

  // For non-image URLs (Instagram/TikTok), make a text-only request
  const requestBody = isActualImage ? {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 1500,
    temperature: 0.7,
  } : {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1500,
    temperature: 0.7,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error('Failed to analyze video content');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const recipeData = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
      throw new Error('Missing required recipe fields');
    }
    
    return recipeData;
  } catch (error) {
    console.error('Failed to parse recipe data:', error);
    console.log('Raw OpenAI response:', content);
    
    // Fallback response
    return {
      title: 'Recipe from Video',
      description: 'Recipe extracted from social media video',
      ingredients: ['Ingredients detected from video - please review and edit'],
      instructions: ['Instructions extracted from video - please review and edit'],
      prep_time: 15,
      cook_time: 30,
      servings: 4,
      difficulty: 'Medium',
      cuisine: null
    };
  }
}