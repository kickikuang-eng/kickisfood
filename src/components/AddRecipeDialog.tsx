import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Link, Loader2, FileText, Video, ArrowLeft } from "lucide-react";

interface AddRecipeDialogProps {
  children: React.ReactNode;
}

type AddMode = 'select' | 'manual' | 'social';

interface ManualRecipeForm {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  prep_time: string;
  cook_time: string;
  servings: string;
  difficulty: string;
  cuisine: string;
  chef: string;
}

export const AddRecipeDialog = ({ children }: AddRecipeDialogProps) => {
  const [mode, setMode] = useState<AddMode>('select');
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
const [manualForm, setManualForm] = useState<ManualRecipeForm>({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    difficulty: 'Easy',
    cuisine: '',
    chef: ''
  });

  const handleSocialMediaExtraction = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save recipes",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const isYouTube = /youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\//.test(url);

      if (isYouTube) {
        // Primary: OpenAI-based extractor for YouTube
        const { data, error } = await supabase.functions.invoke('extract-recipe-from-video', {
          body: { videoUrl: url, userId: user.id }
        });

        if (!error && data?.success) {
          toast({
            title: "Success!",
            description: data.message || `"${data.recipe.title}" has been added to your library.`,
          });
          resetDialog();
          return;
        }

        // Fallback: Gemini-based extractor
        const { data: gData, error: gError } = await supabase.functions.invoke('extract-recipe-with-gemini', {
          body: { videoUrl: url, userId: user.id }
        });

        if (!gError && gData?.success) {
          toast({
            title: "Success!",
            description: gData.message || `"${gData.recipe.title}" has been added to your library.`,
          });
          resetDialog();
          return;
        }

        throw new Error(gError?.message || data?.error || error?.message || 'Failed to extract recipe');
      }

      // Instagram/TikTok and others: use social extractor
      const { data, error } = await supabase.functions.invoke('extract-recipe-from-social', {
        body: { videoUrl: url, userId: user.id }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success!",
          description: data.message || "Recipe extracted and saved successfully!",
        });
        resetDialog();
      } else {
        throw new Error(data.error || "Failed to extract recipe");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to extract recipe from video",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualForm.title.trim()) {
      toast({
        title: "Error",
        description: "Recipe title is required",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save recipes",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const ingredientsArray = manualForm.ingredients
        .split('\n')
        .filter(item => item.trim())
        .map(item => item.trim());

      const instructionsArray = manualForm.instructions
        .split('\n')
        .filter(item => item.trim())
        .map(item => item.trim());

const { error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: manualForm.title,
          description: manualForm.description || null,
          ingredients: ingredientsArray,
          instructions: instructionsArray,
          prep_time: manualForm.prep_time ? parseInt(manualForm.prep_time) : null,
          cook_time: manualForm.cook_time ? parseInt(manualForm.cook_time) : null,
          servings: manualForm.servings ? parseInt(manualForm.servings) : null,
          difficulty: manualForm.difficulty,
          cuisine: manualForm.cuisine || null,
          chef: manualForm.chef || null,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Recipe saved successfully!",
      });
      
      resetDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save recipe",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setOpen(false);
    setMode('select');
    setUrl('');
setManualForm({
      title: '',
      description: '',
      ingredients: '',
      instructions: '',
      prep_time: '',
      cook_time: '',
      servings: '',
      difficulty: 'Easy',
      cuisine: '',
      chef: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { setOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {mode === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Recipe
              </DialogTitle>
              <DialogDescription>
                Choose how you'd like to add your recipe
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setMode('manual')}
              >
                <FileText className="w-8 h-8" />
                <span className="font-medium">Manual Entry</span>
                <span className="text-xs text-muted-foreground">Type in your recipe</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => setMode('social')}
              >
                <Video className="w-8 h-8" />
                <span className="font-medium">From Social Media</span>
                <span className="text-xs text-muted-foreground">Extract from video URL</span>
              </Button>
            </div>
          </>
        )}

        {mode === 'social' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('select')}
                  className="mr-2 p-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Video className="w-5 h-5" />
                Extract from Social Media
              </DialogTitle>
              <DialogDescription>
                Paste a YouTube, TikTok, or Instagram video URL and we'll extract the recipe for you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  placeholder="https://youtube.com/watch?v=... or https://tiktok.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  type="url"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSocialMediaExtraction}
                  disabled={isLoading || !url.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Extracting Recipe...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Extract Recipe
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('select')}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>
            </div>
          </>
        )}

        {mode === 'manual' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('select')}
                  className="mr-2 p-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <FileText className="w-5 h-5" />
                Add Recipe Manually
              </DialogTitle>
              <DialogDescription>
                Fill in the recipe details below
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Recipe Title *</Label>
                  <Input
                    id="title"
                    placeholder="Delicious Pasta Recipe"
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Input
                    id="cuisine"
                    placeholder="Italian, Chinese, etc."
                    value={manualForm.cuisine}
                    onChange={(e) => setManualForm({ ...manualForm, cuisine: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chef">Chef</Label>
                  <Input
                    id="chef"
                    placeholder="e.g., Binging with Babish"
                    value={manualForm.chef}
                    onChange={(e) => setManualForm({ ...manualForm, chef: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your recipe..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prep_time">Prep Time (minutes)</Label>
                  <Input
                    id="prep_time"
                    type="number"
                    placeholder="15"
                    value={manualForm.prep_time}
                    onChange={(e) => setManualForm({ ...manualForm, prep_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cook_time">Cook Time (minutes)</Label>
                  <Input
                    id="cook_time"
                    type="number"
                    placeholder="30"
                    value={manualForm.cook_time}
                    onChange={(e) => setManualForm({ ...manualForm, cook_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    placeholder="4"
                    value={manualForm.servings}
                    onChange={(e) => setManualForm({ ...manualForm, servings: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={manualForm.difficulty}
                  onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ingredients">Ingredients</Label>
                <Textarea
                  id="ingredients"
                  placeholder="1 cup flour&#10;2 eggs&#10;1/2 cup milk&#10;Salt to taste"
                  value={manualForm.ingredients}
                  onChange={(e) => setManualForm({ ...manualForm, ingredients: e.target.value })}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">One ingredient per line</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Mix flour and eggs&#10;Add milk gradually&#10;Cook on medium heat&#10;Serve hot"
                  value={manualForm.instructions}
                  onChange={(e) => setManualForm({ ...manualForm, instructions: e.target.value })}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">One step per line</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleManualSave}
                  disabled={isLoading || !manualForm.title.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving Recipe...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Save Recipe
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('select')}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};