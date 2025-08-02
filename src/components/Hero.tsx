import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Link2, Sparkles, Mic } from "lucide-react";
import { AddRecipeDialog } from "@/components/AddRecipeDialog";

export const Hero = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    try {
      // TODO: Implement recipe scraping functionality
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast({
        title: "Coming Soon!",
        description: "Recipe URL scraping will be available soon.",
      });
      
      setUrl("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process recipe URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <div className="w-full max-w-3xl mx-auto px-6 text-center">
        {/* Main Heading */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold text-slate-800 mb-6 leading-tight">
            What recipe are you working on?
          </h1>
        </div>

        {/* URL Input - OpenAI Style */}
        <Card className="p-3 bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-200 mb-8">
          <form onSubmit={handleUrlSubmit} className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-4 px-4">
              <Link2 className="w-5 h-5 text-slate-400" />
              <Input
                type="url"
                placeholder="Paste any recipe URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="border-0 bg-transparent text-slate-800 placeholder:text-slate-500 focus-visible:ring-0 text-lg py-4"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-600"
                disabled={isLoading}
              >
                <Mic className="w-5 h-5" />
              </Button>
              <Button 
                type="submit" 
                disabled={!url.trim() || isLoading}
                size="icon"
                className="bg-slate-800 hover:bg-slate-700 text-white"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Alternative Action */}
        <div className="flex items-center justify-center gap-3 text-slate-500">
          <span>or</span>
          <AddRecipeDialog>
            <Button 
              variant="link" 
              className="text-slate-600 hover:text-slate-800 p-0 h-auto font-normal"
            >
              add recipe manually
            </Button>
          </AddRecipeDialog>
        </div>
      </div>
    </div>
  );
};