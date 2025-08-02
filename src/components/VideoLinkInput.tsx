import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const VideoLinkInput = () => {
  const [videoLink, setVideoLink] = useState("");

  const handleGenerate = () => {
    if (!videoLink.trim()) return;
    
    // TODO: Implement video processing logic
    console.log("Processing video:", videoLink);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Recipe Video Converter
          </CardTitle>
          <p className="text-muted-foreground">
            Paste an Instagram or TikTok video link to generate a recipe
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="url"
            placeholder="Paste Instagram or TikTok video link..."
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            className="w-full"
          />
          <Button 
            onClick={handleGenerate}
            className="w-full"
            variant="hero"
            disabled={!videoLink.trim()}
          >
            Generate Recipe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};