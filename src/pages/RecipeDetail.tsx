import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  ChefHat, 
  Globe, 
  ExternalLink,
  Edit,
  Trash2
} from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  cook_time: number | null;
  prep_time: number | null;
  servings: number | null;
  difficulty: string | null;
  cuisine: string | null;
  ingredients: string[] | null;
  instructions: string[] | null;
  image_url: string | null;
  source_url: string | null;
  created_at: string;
}

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (id) {
      fetchRecipe(id);
    }
  }, [id]);

  const fetchRecipe = async (recipeId: string) => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch recipe",
          variant: "destructive",
        });
        navigate("/library");
        return;
      }

      setRecipe(data);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recipe",
        variant: "destructive",
      });
      navigate("/library");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete recipe",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      });
      navigate("/library");
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    }
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-muted rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Recipe not found</h2>
            <Button onClick={() => navigate("/library")}>
              Back to Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/library")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>

        {/* Recipe Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{recipe.title}</CardTitle>
                {recipe.description && (
                  <p className="text-muted-foreground text-lg">{recipe.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Recipe Image */}
            {recipe.image_url && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted mt-6">
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Recipe Meta Information */}
            <div className="flex flex-wrap gap-4 mt-6">
              {recipe.prep_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Prep:</span>
                  <span>{formatTime(recipe.prep_time)}</span>
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-2 text-sm">
                  <ChefHat className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Cook:</span>
                  <span>{formatTime(recipe.cook_time)}</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Serves:</span>
                  <span>{recipe.servings}</span>
                </div>
              )}
              {recipe.cuisine && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Cuisine:</span>
                  <Badge variant="secondary">{recipe.cuisine}</Badge>
                </div>
              )}
              {recipe.difficulty && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Difficulty:</span>
                  <Badge variant="outline">{recipe.difficulty}</Badge>
                </div>
              )}
            </div>

            {/* Source URL */}
            {recipe.source_url && (
              <div className="mt-4">
                <Button variant="link" asChild className="p-0 h-auto">
                  <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Original Recipe
                  </a>
                </Button>
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No ingredients listed</p>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.instructions && recipe.instructions.length > 0 ? (
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1">{instruction}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground">No instructions listed</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;