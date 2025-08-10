import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Recipe {
  id?: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  image_url?: string | null;
  source_url?: string | null;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  cuisine?: string | null;
  difficulty?: string | null;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const Analyze = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = query.get("url") || "";

  useEffect(() => {
    const run = async () => {
      if (!user) {
        toast({ title: "Sign in required", description: "Please sign in to analyze and save recipes.", variant: "destructive" });
        navigate("/auth");
        return;
      }
      if (!url) {
        setError("No URL provided.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const isInstagram = /instagram\.com\/(?:p|reel)\//.test(url);
        if (isInstagram) {
          const { data: gData, error: gError } = await supabase.functions.invoke('extract-recipe-with-gemini', {
            body: { videoUrl: url, userId: user.id }
          });
          if (!gError && gData?.success) {
            setRecipe(gData.recipe);
            toast({ title: "Recipe extracted", description: gData.recipe?.title || "Saved to your library" });
          } else {
            // fallback
            const { data, error } = await supabase.functions.invoke('extract-recipe-from-video', {
              body: { videoUrl: url, userId: user.id }
            });
            if (!error && data?.success) {
              setRecipe(data.recipe);
              toast({ title: "Recipe extracted", description: data.recipe?.title || "Saved to your library" });
            } else {
              throw new Error(gError?.message || data?.error || error?.message || 'Failed to extract recipe');
            }
          }
        } else {
          const { data, error } = await supabase.functions.invoke('extract-recipe-from-video', {
            body: { videoUrl: url, userId: user.id }
          });
          if (!error && data?.success) {
            setRecipe(data.recipe);
            toast({ title: "Recipe extracted", description: data.recipe?.title || "Saved to your library" });
          } else {
            const { data: gData, error: gError } = await supabase.functions.invoke('extract-recipe-with-gemini', {
              body: { videoUrl: url, userId: user.id }
            });
            if (!gError && gData?.success) {
              setRecipe(gData.recipe);
              toast({ title: "Recipe extracted", description: gData.recipe?.title || "Saved to your library" });
            } else {
              throw new Error(gError?.message || gData?.error || 'Failed to extract recipe');
            }
          }
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, user?.id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center text-muted-foreground">Analyzing…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-xl w-full">
          <h1 className="text-2xl font-semibold mb-2">Analysis failed</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>Go back</Button>
        </Card>
      </main>
    );
  }

  if (!recipe) return null;

  return (
    <main className="min-h-screen py-10 container mx-auto px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">{recipe.title}</h1>
        {recipe.source_url && (
          <p className="text-sm text-muted-foreground mb-6">Source: <a className="underline" href={recipe.source_url} target="_blank" rel="noreferrer">{recipe.source_url}</a></p>
        )}
        <Card className="p-6 mb-6">
          <p className="mb-2">{recipe.description}</p>
          <div className="grid md:grid-cols-3 gap-3 text-sm text-muted-foreground mb-4">
            <div>Prep: {recipe.prep_time_minutes ?? '—'} min</div>
            <div>Cook: {recipe.cook_time_minutes ?? '—'} min</div>
            <div>Servings: {recipe.servings ?? '—'}</div>
          </div>
          <h2 className="text-xl font-medium mt-4 mb-2">Ingredients</h2>
          <ul className="list-disc pl-6 space-y-1">
            {recipe.ingredients?.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
          <h2 className="text-xl font-medium mt-6 mb-2">Instructions</h2>
          <ol className="list-decimal pl-6 space-y-2">
            {recipe.instructions?.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
          <div className="mt-6 flex gap-3">
            {recipe.id && (
              <Button variant="secondary" onClick={() => navigate(`/recipe/${recipe.id}`)}>Open in Library</Button>
            )}
            <Button onClick={() => navigate('/')}>Done</Button>
          </div>
        </Card>
      </div>
    </main>
  );
};

export default Analyze;
