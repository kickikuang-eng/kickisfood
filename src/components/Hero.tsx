import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Link, Loader2 } from "lucide-react";
import { AddRecipeDialog } from "@/components/AddRecipeDialog";

export const Hero = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConvertRecipe = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement recipe scraping functionality
      toast({
        title: "Coming Soon",
        description: "Recipe scraping will be implemented soon!",
      });
      
      // Reset form after delay
      setTimeout(() => {
        setUrl("");
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scrape recipe from URL",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="text-gray-900">Save Recipes</span>
                <br />
                <span className="text-gray-900">From </span>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                  Anywhere
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-xl leading-relaxed">
                Find, import, and organize your recipes from Instagram, Facebook, 
                TikTok and YouTube. Save recipes from handwritten notes, cookbooks, 
                or your favorite recipe websites. Get cooking for free!
              </p>
            </div>

            
            {/* URL Input Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <Link className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-900">Add Recipe from URL</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Paste any recipe URL and we'll extract the ingredients and instructions for you.
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="https://example.com/recipe"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  type="url"
                  className="flex-1"
                />
                <Button
                  onClick={handleConvertRecipe}
                  disabled={isLoading || !url.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Convert
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Add Recipe Button */}
            <div className="flex justify-center">
              <AddRecipeDialog>
                <Button variant="outline" className="px-8 py-4 rounded-lg text-lg font-medium flex items-center gap-3">
                  <Plus className="w-6 h-6" />
                  Or Add Recipe Manually
                </Button>
              </AddRecipeDialog>
            </div>
          </div>

          {/* Right Content - App Preview */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full w-96 h-96 mx-auto flex items-center justify-center">
              {/* Social Media Icons */}
              <div className="absolute -top-4 -right-4 bg-red-600 rounded-full p-3 shadow-lg">
                <div className="text-white font-bold text-lg">Y</div>
              </div>
              <div className="absolute top-10 -left-4 bg-pink-600 rounded-full p-3 shadow-lg">
                <div className="text-white font-bold text-lg">I</div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-black rounded-full p-3 shadow-lg">
                <div className="text-white font-bold text-lg">T</div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-blue-600 rounded-full p-3 shadow-lg">
                <div className="text-white font-bold text-lg">F</div>
              </div>
              
              {/* Phone Mockup */}
              <div className="bg-white rounded-3xl p-6 shadow-2xl w-64 h-80">
                <div className="bg-gray-100 rounded-2xl h-full flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">My Recipes</div>
                  </div>
                  <div className="flex-1 p-4 space-y-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="h-20 bg-orange-200 rounded-lg mb-2"></div>
                      <div className="text-xs font-medium">Blueberry Smoothie Bowl</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="h-20 bg-green-200 rounded-lg mb-2"></div>
                      <div className="text-xs font-medium">Avocado Toast</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-4 bg-white rounded-full px-8 py-4 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-emerald-600 rounded-full"></div>
              </div>
              <span className="text-gray-600">More than</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">400,000+</div>
            <div className="text-gray-600">recipes saved</div>
          </div>
        </div>
      </div>
    </section>
  );
};