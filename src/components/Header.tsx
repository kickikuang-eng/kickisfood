import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">RecipeVault</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-emerald-600 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-foreground hover:text-emerald-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-foreground hover:text-emerald-600 transition-colors">
              FAQ
            </a>
            <a href="#blog" className="text-foreground hover:text-emerald-600 transition-colors">
              Blog
            </a>
          </nav>

          {/* Sign Up Button */}
          <div className="flex items-center gap-3">
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full font-medium"
            >
              Sign up free
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};