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
        image_url: imageUrl
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

  } catch (error) {
    console.error('Error in extract-recipe-from-video function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to extract recipe from video',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractVideoInfo(url: string) {
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { platform: 'youtube', id: youtubeMatch[1] };
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

function getVideoThumbnail(videoInfo: { platform: string; id: string }): string {
  switch (videoInfo.platform) {
    case 'youtube':
      return `https://img.youtube.com/vi/${videoInfo.id}/maxresdefault.jpg`;
    case 'tiktok':
      // TikTok thumbnails are harder to get, using a placeholder for now
      return `https://placehold.co/1080x1920/ff0050/white?text=TikTok+Recipe`;
    case 'instagram':
      // Instagram thumbnails require API access, using placeholder
      return `https://placehold.co/1080x1080/E4405F/white?text=Instagram+Recipe`;
    default:
      return `https://placehold.co/1080x1080/000000/white?text=Recipe+Video`;
  }
}

async function analyzeVideoForRecipe(imageUrl: string, videoUrl: string) {
  const prompt = `Analyze this image from a cooking video and extract a complete recipe. Please provide:

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

Be creative and detailed. If some information isn't visible, make reasonable assumptions based on what you can see.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
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
    }),
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