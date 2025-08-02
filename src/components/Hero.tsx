import { Button } from "@/components/ui/button";
import { Plus, Video, ChefHat } from "lucide-react";
import heroImage from "@/assets/hero-cooking.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-warm-brown/80 via-warm-brown/60 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center mb-6">
          <ChefHat className="w-16 h-16 text-warm-orange animate-float" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          Your Digital
          <span className="block text-warm-orange">Recipe Book</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
          Transform your saved Instagram & TikTok recipe videos into organized, 
          easy-to-follow recipes. Never lose track of that perfect dish again.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="hero" size="lg" className="text-lg px-8 py-4">
            <Plus className="w-5 h-5" />
            Add Your First Recipe
          </Button>
          
          <Button variant="outline" size="lg" className="text-lg px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Video className="w-5 h-5" />
            Browse Recipes
          </Button>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-warm-orange mb-2">🎥</div>
            <h3 className="text-white font-semibold mb-2">Video to Recipe</h3>
            <p className="text-white/80 text-sm">Automatically transcribe and convert video recipes</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-warm-orange mb-2">📝</div>
            <h3 className="text-white font-semibold mb-2">Organized Format</h3>
            <p className="text-white/80 text-sm">Clean ingredients, steps, and cooking times</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-warm-orange mb-2">💡</div>
            <h3 className="text-white font-semibold mb-2">Personal Notes</h3>
            <p className="text-white/80 text-sm">Add your own tips and modifications</p>
          </div>
        </div>
      </div>
    </section>
  );
};