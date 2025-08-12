import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Link2, Cloud, Image as ImageIcon, X } from "lucide-react";

interface ImageUploadInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ImageUploadInput = ({ value, onChange, placeholder = "Enter image URL" }: ImageUploadInputProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUpload = async (file: File) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload images",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(data.path);

      onChange(publicUrl);
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      toast({
        title: "Success",
        description: "Image URL updated",
      });
    }
  };

  const clearImage = () => {
    onChange('');
    setUrlInput('');
  };

  const openGoogleDrive = () => {
    window.open('https://drive.google.com/drive/my-drive', '_blank');
    toast({
      title: "Google Drive",
      description: "Right-click on an image and select 'Get link' to share it",
    });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="w-4 h-4 mr-2" />
            URL
          </TabsTrigger>
          <TabsTrigger value="drive">
            <Cloud className="w-4 h-4 mr-2" />
            Google Drive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop an image here, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Choose File"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Supports JPG, PNG, WebP (max 5MB)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={placeholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlSubmit();
                    }
                  }}
                />
              </div>
              <Button onClick={handleUrlSubmit} className="w-full">
                Use This URL
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drive" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <Cloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Get a shareable link from Google Drive
                </p>
                <Button onClick={openGoogleDrive} className="w-full">
                  Open Google Drive
                </Button>
                <div className="mt-4 p-3 bg-muted rounded-lg text-left">
                  <p className="text-xs text-muted-foreground">
                    <strong>How to get a link:</strong><br />
                    1. Upload image to Google Drive<br />
                    2. Right-click the image<br />
                    3. Select "Get link"<br />
                    4. Set to "Anyone with the link"<br />
                    5. Copy and paste the link in the URL tab
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Current Image Preview */}
      {value && (
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <img
                src={value}
                alt="Recipe image preview"
                className="w-full h-32 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={clearImage}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {value}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};