import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

export const Hero = () => {
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
                or your favorite recipe websites. Get cooking with RecipeVault for free!
              </p>
            </div>

            {/* App Store Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg flex items-center gap-3 text-base font-medium">
                <Download className="w-5 h-5" />
                Download on the App Store
              </Button>
              
              <Button className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg flex items-center gap-3 text-base font-medium">
                <Smartphone className="w-5 h-5" />
                Get it on Google Play
              </Button>
            </div>

            <div className="text-center text-gray-500 font-medium">OR</div>

            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg text-lg font-medium">
              Try it on the web
            </Button>
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