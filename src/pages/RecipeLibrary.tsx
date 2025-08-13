import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Clock, Users, ChefHat, ChevronsUpDown, Trash2 } from "lucide-react";
import { AddRecipeDialog } from "@/components/AddRecipeDialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLanguage } from "@/contexts/LanguageProvider";
import { translateTexts } from "@/lib/translate";
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
  chef: string | null;
}

const RecipeLibrary = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { lang } = useLanguage();
  const [titleMap, setTitleMap] = useState<Map<string, string>>(new Map());
  const [descMap, setDescMap] = useState<Map<string, string>>(new Map());

  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [chefFilter, setChefFilter] = useState<string>("");
  const [chefOpen, setChefOpen] = useState(false);
  const [chefQuery, setChefQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");

  const difficulties = Array.from(new Set(recipes.map(r => r.difficulty).filter(Boolean))) as string[];
  const cuisines = Array.from(new Set(recipes.map(r => r.cuisine).filter(Boolean))) as string[];
  const chefs = Array.from(new Set(recipes.map(r => r.chef).filter(Boolean))) as string[];

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchRecipes();
  }, []);

  // On-the-fly translation for list view
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (lang !== "sv" || recipes.length === 0) {
        setTitleMap(new Map());
        setDescMap(new Map());
        return;
      }
      const uniqueTitles = Array.from(new Set(recipes.map((r) => r.title).filter(Boolean)));
      const uniqueDescs = Array.from(new Set(recipes.map((r) => r.description || "").filter((d) => d)));
      const [tTitles, tDescs] = await Promise.all([
        translateTexts(uniqueTitles, "sv", { mode: "recipe", hint: "title" }),
        translateTexts(uniqueDescs, "sv", { mode: "recipe", hint: "description" }),
      ]);
      if (!mounted) return;
      const tMap = new Map<string, string>();
      uniqueTitles.forEach((t, i) => tMap.set(t, tTitles[i] || t));
      setTitleMap(tMap);
      const dMap = new Map<string, string>();
      uniqueDescs.forEach((d, i) => dMap.set(d, tDescs[i] || d));
      setDescMap(dMap);
    })();
    return () => { mounted = false; };
  }, [lang, recipes]);
  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch recipes",
          variant: "destructive",
        });
        return;
      }

      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recipes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this recipe?')) return;
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to delete recipe', variant: 'destructive' });
        return;
      }

      setRecipes((prev) => prev.filter((r) => r.id !== id));
      toast({ title: 'Deleted', description: 'Recipe removed.' });
    } catch (err) {
      console.error('Error deleting recipe:', err);
      toast({ title: 'Error', description: 'Failed to delete recipe', variant: 'destructive' });
    }
  };

const filteredRecipes = recipes.filter((recipe) => {
  const query = searchTerm.toLowerCase();
  const matchesSearch =
    recipe.title.toLowerCase().includes(query) ||
    (recipe.description?.toLowerCase().includes(query) ?? false) ||
    (recipe.cuisine?.toLowerCase().includes(query) ?? false) ||
    (recipe.chef?.toLowerCase().includes(query) ?? false);

  const matchesDifficulty =
    difficultyFilter === "all" ||
    (recipe.difficulty?.toLowerCase() === difficultyFilter.toLowerCase());

  const matchesCuisine =
    cuisineFilter === "all" ||
    (recipe.cuisine?.toLowerCase() === cuisineFilter.toLowerCase());

  const matchesChef =
    !chefFilter ||
    (recipe.chef?.toLowerCase().includes(chefFilter.toLowerCase()) ?? false);

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const matchesTime = maxTime == null || totalTime <= maxTime;

  return matchesSearch && matchesDifficulty && matchesCuisine && matchesChef && matchesTime;
});

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'time-asc': {
        const ta = (a.prep_time || 0) + (a.cook_time || 0);
        const tb = (b.prep_time || 0) + (b.cook_time || 0);
        return ta - tb;
      }
      case 'time-desc': {
        const ta = (a.prep_time || 0) + (a.cook_time || 0);
        const tb = (b.prep_time || 0) + (b.cook_time || 0);
        return tb - ta;
      }
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{lang === 'sv' ? 'Mitt receptbibliotek' : 'My Recipe Library'}</h1>
            <p className="text-muted-foreground mt-2">
              {recipes.length} {lang === 'sv' ? 'recept' : 'recipe'}{recipes.length !== 1 ? (lang === 'sv' ? 'er' : 's') : ''} {lang === 'sv' ? 'sparade' : 'saved'}
            </p>
          </div>
          <AddRecipeDialog>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              {lang === 'sv' ? 'Lägg till recept' : 'Add Recipe'}
            </Button>
          </AddRecipeDialog>
        </div>

{/* Search + Filters */}
<div className="space-y-4 mb-8">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
    <Input
      placeholder={lang === 'sv' ? 'Sök recept efter titel, beskrivning eller kök...' : 'Search recipes by title, description, or cuisine...'}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>

<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
    <div className="flex flex-col gap-2">
      <Label htmlFor="difficulty">Difficulty</Label>
      <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
        <SelectTrigger id="difficulty">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {difficulties.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex flex-col gap-2">
      <Label htmlFor="cuisine">Cuisine</Label>
      <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
        <SelectTrigger id="cuisine">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {cuisines.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex flex-col gap-2">
      <Label htmlFor="chef">Chef</Label>
      <Popover open={chefOpen} onOpenChange={setChefOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={chefOpen} className="justify-between">
            {chefFilter ? chefFilter : "All"}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
<PopoverContent className="w-[240px] p-0 z-50 bg-background">
  <Command>
    <CommandInput
      placeholder="Type a chef..."
      value={chefQuery}
      onValueChange={setChefQuery}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setChefFilter(chefQuery);
          setChefOpen(false);
        }
      }}
    />
    <CommandList>
      <CommandEmpty>No chefs found.</CommandEmpty>
      <CommandGroup>
        <CommandItem
          value="all"
          onSelect={() => {
            setChefFilter("");
            setChefQuery("");
            setChefOpen(false);
          }}
        >
          All
        </CommandItem>
{chefs.map((c) => (
  <CommandItem
    key={c ?? "unknown"}
    value={String(c ?? "")}
    onSelect={(val) => {
      setChefFilter(val);
      setChefQuery(val);
      setChefOpen(false);
    }}
  >
    {c}
  </CommandItem>
))}
      </CommandGroup>
    </CommandList>
  </Command>
</PopoverContent>
      </Popover>
    </div>

    <div className="flex flex-col gap-2">
      <Label htmlFor="maxtime">Max total time ({maxTime ?? "∞"} min)</Label>
      <Slider
        id="maxtime"
        min={10}
        max={240}
        step={5}
        value={[maxTime ?? 240]}
        onValueChange={(vals) => setMaxTime(vals[0] === 240 ? null : vals[0])}
      />
      <div className="text-xs text-muted-foreground">Filter by prep + cook time</div>
    </div>

    <div className="flex flex-col gap-2">
      <Label htmlFor="sort">Sort</Label>
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger id="sort">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="title-asc">Title A–Z</SelectItem>
          <SelectItem value="title-desc">Title Z–A</SelectItem>
          <SelectItem value="time-asc">Total time ↑</SelectItem>
          <SelectItem value="time-desc">Total time ↓</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-end">
      <Button variant="outline" onClick={() => { setDifficultyFilter("all"); setCuisineFilter("all"); setChefFilter(""); setChefQuery(""); setMaxTime(null); }}>
        Clear filters
      </Button>
    </div>
  </div>
</div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-32 bg-muted rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && recipes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Plus className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No recipes yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building your recipe collection by adding your first recipe
            </p>
            <AddRecipeDialog>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Recipe
              </Button>
            </AddRecipeDialog>
          </div>
        )}

        {/* No Search Results */}
        {!isLoading && recipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or add a new recipe
            </p>
          </div>
        )}

        {/* Recipe Grid */}
        {!isLoading && filteredRecipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRecipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                className="relative group hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/recipe/${recipe.id}`)}
              >
<Button
  variant="ghost"
  size="icon"
  aria-label="Delete recipe"
  className="absolute top-2 right-2 z-10"
  onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
>
  <Trash2 className="w-4 h-4" />
</Button>
<CardHeader className="pr-12">
                  <CardTitle className="line-clamp-2">{lang === 'sv' ? (titleMap.get(recipe.title) || recipe.title) : recipe.title}</CardTitle>
                  {recipe.description && (
                    <CardDescription className="line-clamp-2">
                      {lang === 'sv' ? (descMap.get(recipe.description) || recipe.description) : recipe.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {recipe.image_url && (
                    <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {recipe.cuisine && (
                      <Badge variant="secondary">{recipe.cuisine}</Badge>
                    )}
                    {recipe.difficulty && (
                      <Badge variant="outline">{recipe.difficulty}</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {recipe.chef && (
                      <div className="flex items-center gap-1">
                        <ChefHat className="w-4 h-4" />
                        <span>{recipe.chef}</span>
                      </div>
                    )}
                    {(recipe.prep_time || recipe.cook_time) && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime((recipe.prep_time || 0) + (recipe.cook_time || 0))}
                        </span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeLibrary;