# Instagram and TikTok Recipe Extraction Setup

## Overview

Your app now has improved Instagram and TikTok recipe extraction capabilities. Here's what was implemented and how to deploy it.

## What Was Fixed

### 1. Instagram Extraction
- **Facebook App Integration**: Added proper Facebook App credentials support
- **oEmbed API**: Uses Instagram's oEmbed API to extract captions and metadata
- **Fallback Handling**: When oEmbed fails, extracts basic info from URL structure
- **Better Error Handling**: More detailed logging and graceful fallbacks

### 2. TikTok Extraction
- **Firecrawl Integration**: Attempts to scrape TikTok content using Firecrawl
- **Fallback Approach**: When scraping fails, creates recipe from URL structure
- **Improved Prompts**: Better AI prompts for recipe reconstruction

### 3. Enhanced AI Prompts
- **Platform-Specific**: Different prompts for Instagram vs TikTok content
- **Creative Reconstruction**: AI can create reasonable recipes even with limited content
- **Better Error Messages**: Clearer feedback when extraction has limitations

## Setup Instructions

### Step 1: Set Environment Variables

Run the setup script to configure your Facebook App credentials:

```bash
./setup-env.sh
```

This will set:
- `FACEBOOK_APP_ID=761882186335606`
- `FACEBOOK_APP_SECRET=67e3017939be23a4f07565cb240bea17`

### Step 2: Deploy Edge Functions

Deploy the updated functions to Supabase:

```bash
supabase functions deploy extract-recipe-from-social
supabase functions deploy extract-recipe-from-video
supabase functions deploy extract-recipe-with-gemini
```

### Step 3: Test the Integration

1. **Instagram Test**: Try pasting an Instagram reel or post URL
2. **TikTok Test**: Try pasting a TikTok video URL
3. **Check Logs**: Monitor the function logs for detailed extraction information

## How It Works

### Instagram Flow
1. **oEmbed API**: Attempts to fetch Instagram post metadata using Facebook Graph API
2. **Caption Analysis**: Extracts recipe information from the post caption
3. **Fallback**: If API fails, creates recipe from URL structure
4. **AI Processing**: Uses Gemini to reconstruct recipe from available information

### TikTok Flow
1. **Firecrawl Scraping**: Attempts to scrape TikTok page content
2. **Content Analysis**: Extracts recipe information from scraped content
3. **Fallback**: If scraping fails, creates recipe from URL structure
4. **AI Processing**: Uses Gemini to reconstruct recipe from available information

## Expected Behavior

### Success Cases
- **Instagram**: Should extract captions and create recipes from post content
- **TikTok**: Should scrape page content and extract recipe information
- **Both**: Will create reasonable recipes even with limited information

### Fallback Cases
- **API Failures**: Creates placeholder recipes with clear indication of limitations
- **Scraping Blocks**: Falls back to URL-based recipe creation
- **Limited Content**: AI reconstructs recipes based on culinary knowledge

## Troubleshooting

### Common Issues

1. **Instagram oEmbed Fails**
   - Check Facebook App credentials are set correctly
   - Verify the Instagram post is public
   - Check function logs for specific error messages

2. **TikTok Scraping Fails**
   - TikTok has strong anti-scraping measures
   - Fallback will create basic recipe from URL
   - Consider using TikTok's official API for better results

3. **Environment Variables Not Set**
   - Run `./setup-env.sh` again
   - Check with `supabase secrets list`

### Debugging

Check function logs for detailed information:

```bash
supabase functions logs extract-recipe-from-social
```

## Limitations

### Instagram
- Requires public posts
- oEmbed API has rate limits
- Some posts may not have detailed recipe information

### TikTok
- Strong anti-scraping measures
- Content may be limited
- Requires creative recipe reconstruction

## Next Steps

1. **Test with Real URLs**: Try with actual Instagram and TikTok recipe posts
2. **Monitor Performance**: Check function logs for success rates
3. **User Feedback**: Collect feedback on recipe quality
4. **Iterate**: Improve prompts based on results

## Facebook App Setup (Optional)

If you need to create your own Facebook App:

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Instagram Basic Display product
4. Get App ID and App Secret
5. Update environment variables

## Support

If you encounter issues:
1. Check function logs for error details
2. Verify environment variables are set
3. Test with different Instagram/TikTok URLs
4. Consider the platform's limitations and restrictions
