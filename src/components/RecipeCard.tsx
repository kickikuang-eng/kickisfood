import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ChefHat, ExternalLink } from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  description: string;
  cookingTime: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  videoUrl: string;
  image?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export const RecipeCard = ({ recipe, onClick }: RecipeCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "Hard": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-card hover:scale-[1.02] bg-gradient-card border-warm-orange/20"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg text-foreground group-hover:text-warm-orange transition-colors line-clamp-2">
            {recipe.title}
          </h3>
          <a 
            href={recipe.videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1 hover:bg-warm-orange/10 rounded-full transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4 text-warm-orange" />
          </a>
        </div>
        
        <p className="text-muted-foreground text-sm line-clamp-2">
          {recipe.description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.cookingTime}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <ChefHat className="w-4 h-4" />
            <Badge variant="secondary" className={getDifficultyColor(recipe.difficulty)}>
              {recipe.difficulty}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {recipe.tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs border-warm-orange/30 text-warm-orange hover:bg-warm-orange/10"
            >
              {tag}
            </Badge>
          ))}
          {recipe.tags.length > 3 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{recipe.tags.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};