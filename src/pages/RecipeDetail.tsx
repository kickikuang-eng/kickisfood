import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Save,
  X,
  Trash2,
  Plus,
  Minus
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Recipe>>({});
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
        .maybeSingle();

      if (error) {
        console.error('Error fetching recipe:', error);
        toast({
          title: "Error",
          description: "Failed to fetch recipe",
          variant: "destructive",
        });
        navigate("/library");
        return;
      }

      if (!data) {
        toast({
          title: "Recipe not found",
          description: "The recipe you're looking for doesn't exist or has been deleted",
          variant: "destructive",
        });
        navigate("/library");
        return;
      }

      setRecipe(data);
      // Initialize edit form with current recipe data
      setEditForm(data || {});
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

  const handleSave = async () => {
    if (!recipe || !editForm.title?.trim()) {
      toast({
        title: "Error",
        description: "Recipe title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('recipes')
        .update({
          title: editForm.title,
          description: editForm.description,
          ingredients: editForm.ingredients,
          instructions: editForm.instructions,
          prep_time: editForm.prep_time,
          cook_time: editForm.cook_time,
          servings: editForm.servings,
          difficulty: editForm.difficulty,
          cuisine: editForm.cuisine,
          image_url: editForm.image_url,
          source_url: editForm.source_url,
        })
        .eq('id', recipe.id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update recipe",
          variant: "destructive",
        });
        return;
      }

      setRecipe(data);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Recipe updated successfully",
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast({
        title: "Error",
        description: "Failed to update recipe",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditForm(recipe || {});
    setIsEditing(false);
  };

  const addIngredient = () => {
    const ingredients = editForm.ingredients || [];
    setEditForm({
      ...editForm,
      ingredients: [...ingredients, '']
    });
  };

  const removeIngredient = (index: number) => {
    const ingredients = editForm.ingredients || [];
    setEditForm({
      ...editForm,
      ingredients: ingredients.filter((_, i) => i !== index)
    });
  };

  const updateIngredient = (index: number, value: string) => {
    const ingredients = editForm.ingredients || [];
    const updated = [...ingredients];
    updated[index] = value;
    setEditForm({
      ...editForm,
      ingredients: updated
    });
  };

  const addInstruction = () => {
    const instructions = editForm.instructions || [];
    setEditForm({
      ...editForm,
      instructions: [...instructions, '']
    });
  };

  const removeInstruction = (index: number) => {
    const instructions = editForm.instructions || [];
    setEditForm({
      ...editForm,
      instructions: instructions.filter((_, i) => i !== index)
    });
  };

  const updateInstruction = (index: number, value: string) => {
    const instructions = editForm.instructions || [];
    const updated = [...instructions];
    updated[index] = value;
    setEditForm({
      ...editForm,
      instructions: updated
    });
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
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Recipe title"
                      className="text-3xl font-bold border-0 p-0 h-auto text-foreground"
                    />
                    <Textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Recipe description"
                      className="text-lg text-muted-foreground border-0 p-0 resize-none"
                    />
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-3xl mb-2">{recipe.title}</CardTitle>
                    {recipe.description && (
                      <p className="text-muted-foreground text-lg">{recipe.description}</p>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Recipe Image */}
            {(recipe.image_url || isEditing) && (
              <div className="mt-6">
                {isEditing ? (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Recipe Image</label>
                    <ImageUploadInput
                      value={editForm.image_url || ''}
                      onChange={(url) => setEditForm({ ...editForm, image_url: url })}
                      placeholder="Enter image URL or upload from computer"
                    />
                  </div>
                ) : null}
                {(recipe.image_url || editForm.image_url) && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={isEditing ? editForm.image_url || '' : recipe.image_url || ''}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Recipe Meta Information */}
            <div className="flex flex-wrap gap-4 mt-6">
              {isEditing ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Prep Time (min)</label>
                    <Input
                      type="number"
                      value={editForm.prep_time || ''}
                      onChange={(e) => setEditForm({ ...editForm, prep_time: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Cook Time (min)</label>
                    <Input
                      type="number"
                      value={editForm.cook_time || ''}
                      onChange={(e) => setEditForm({ ...editForm, cook_time: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Servings</label>
                    <Input
                      type="number"
                      value={editForm.servings || ''}
                      onChange={(e) => setEditForm({ ...editForm, servings: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="4"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Difficulty</label>
                    <Select
                      value={editForm.difficulty || ''}
                      onValueChange={(value) => setEditForm({ ...editForm, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block">Cuisine</label>
                    <Input
                      value={editForm.cuisine || ''}
                      onChange={(e) => setEditForm({ ...editForm, cuisine: e.target.value })}
                      placeholder="Italian, Mexican, etc."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block">Source URL</label>
                    <Input
                      value={editForm.source_url || ''}
                      onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Source URL */}
            {!isEditing && recipe.source_url && (
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Ingredients</CardTitle>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={addIngredient}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  {(editForm.ingredients || []).map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ingredient}
                        onChange={(e) => updateIngredient(index, e.target.value)}
                        placeholder="Enter ingredient..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(!editForm.ingredients || editForm.ingredients.length === 0) && (
                    <p className="text-muted-foreground">No ingredients added yet. Click "Add" to start.</p>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Instructions</CardTitle>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={addInstruction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  {(editForm.instructions || []).map((instruction, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <Textarea
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        placeholder="Enter instruction..."
                        className="flex-1 min-h-[60px]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeInstruction(index)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(!editForm.instructions || editForm.instructions.length === 0) && (
                    <p className="text-muted-foreground">No instructions added yet. Click "Add" to start.</p>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;