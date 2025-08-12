import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

export const VideoLinkInput = () => {
  const [videoLink, setVideoLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(20);
  const { toast } = useToast();

  const handlePasteAndSave = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setVideoLink(text);
      toast({
        title: "Link pasted",
        description: "Social media link has been pasted successfully",
      });
    } catch (err) {
      toast({
        title: "Paste failed",
        description: "Could not paste from clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSaveRecipe = () => {
    if (!videoLink.trim()) {
      toast({
        title: "Missing link",
        description: "Please enter a social media link",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    // TODO: Implement video processing logic
    console.log("Processing video:", videoLink);
    
    // Simulate processing
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Recipe saved!",
        description: "Your recipe has been processed and saved",
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="w-full p-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Kickisfood</h1>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex items-center justify-center p-4 pt-12">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8 p-4 rounded-lg border bg-card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">Free social media imports</span>
            <Button variant="outline" size="sm" className="text-xs">
              Get more
            </Button>
          </div>
          <Progress value={progress} className="mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 of 5 used</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Main Form */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">📱</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Save recipe from social media</h1>
          </div>
          
          <p className="text-muted-foreground max-w-md mx-auto">
            Grab a recipe from Instagram, Facebook, TikTok or YouTube. We'll do the rest!
            <br />
            Works best if the recipe is in the caption.
          </p>

          {/* Social Media Icons */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-semibold">IG</span>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">f</span>
            </div>
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">🎵</span>
            </div>
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">▶️</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-foreground mb-2">Link</label>
              <Input
                type="url"
                placeholder="https://www.instagram.com/p/post-id/"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handlePasteAndSave}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Paste & save
              </Button>
              <Button
                onClick={handleSaveRecipe}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={!videoLink.trim() || isLoading}
              >
                {isLoading ? "Processing..." : "Save recipe"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};