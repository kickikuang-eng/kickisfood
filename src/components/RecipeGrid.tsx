import { useState } from "react";
import { RecipeCard } from "./RecipeCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus } from "lucide-react";

// Sample data - this would come from your backend/storage later
const sampleRecipes = [
  {
    id: "1",
    title: "Creamy Garlic Parmesan Pasta",
    description: "A rich and creamy pasta dish with garlic, parmesan, and fresh herbs. Perfect for a quick weeknight dinner.",
    cookingTime: "20 min",
    difficulty: "Easy" as const,
    tags: ["#pasta", "#italian", "#quick", "#vegetarian"],
    videoUrl: "https://instagram.com/example",
  },
  {
    id: "2", 
    title: "Korean Kimchi Fried Rice",
    description: "Spicy and flavorful fried rice made with kimchi, vegetables, and a perfectly fried egg on top.",
    cookingTime: "15 min",
    difficulty: "Medium" as const,
    tags: ["#korean", "#spicy", "#rice", "#kimchi"],
    videoUrl: "https://tiktok.com/example",
  },
  {
    id: "3",
    title: "Homemade Croissants",
    description: "Buttery, flaky croissants made from scratch. Takes time but the results are absolutely worth it!",
    cookingTime: "4 hours",
    difficulty: "Hard" as const,
    tags: ["#french", "#breakfast", "#pastry", "#baking"],
    videoUrl: "https://instagram.com/example",
  },
];

export const RecipeGrid = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const filteredRecipes = sampleRecipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Your Recipe Collection
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Organized, searchable, and ready to cook. All your favorite recipes in one place.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search recipes or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="default">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            
            <Button variant="warm" size="default">
              <Plus className="w-4 h-4" />
              Add Recipe
            </Button>
          </div>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipe(recipe.id)}
            />
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No recipes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or add a new recipe to get started.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};