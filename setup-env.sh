#!/bin/bash

# Set up Facebook/Instagram API credentials for Supabase Edge Functions
echo "Setting up Facebook/Instagram API credentials..."

# Set Facebook App credentials
supabase secrets set FACEBOOK_APP_ID=761882186335606
supabase secrets set FACEBOOK_APP_SECRET=67e3017939be23a4f07565cb240bea17

echo "Environment variables set successfully!"
echo "You can now deploy your functions with: supabase functions deploy"
