import { Button } from "@/components/ui/button";
import { ChefHat, Plus, Settings } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-warm rounded-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">RecipeVault</h1>
              <p className="text-xs text-muted-foreground">Social Recipe Organizer</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#recipes" className="text-foreground hover:text-warm-orange transition-colors">
              My Recipes
            </a>
            <a href="#add" className="text-foreground hover:text-warm-orange transition-colors">
              Add Recipe
            </a>
            <a href="#about" className="text-foreground hover:text-warm-orange transition-colors">
              How It Works
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="warm" size="sm" className="hidden sm:flex">
              <Plus className="w-4 h-4" />
              Add Recipe
            </Button>
            
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};