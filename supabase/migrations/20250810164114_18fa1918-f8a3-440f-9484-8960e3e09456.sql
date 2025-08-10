-- Add 'chef' column to recipes for filtering by chef name
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS chef text;

-- Optional index to speed up filtering/searching by chef
CREATE INDEX IF NOT EXISTS idx_recipes_chef ON public.recipes (chef);