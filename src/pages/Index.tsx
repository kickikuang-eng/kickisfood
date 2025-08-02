import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { RecipeGrid } from "@/components/RecipeGrid";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <Hero />
      <RecipeGrid />
    </div>
  );
};

export default Index;