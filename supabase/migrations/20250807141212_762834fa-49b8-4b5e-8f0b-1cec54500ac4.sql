-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recipe-images', 'recipe-images', true);

-- Create RLS policies for recipe images bucket
CREATE POLICY "Users can view recipe images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'recipe-images');

CREATE POLICY "Users can upload their own recipe images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own recipe images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own recipe images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);