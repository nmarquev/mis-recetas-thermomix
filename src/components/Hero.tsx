import { Button } from "@/components/ui/button";
import { ChefHat, Heart, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-kitchen.jpg";

interface HeroProps {
  onGetStarted: () => void;
  onViewFeatured: () => void;
}

export const Hero = ({ onGetStarted, onViewFeatured }: HeroProps) => {
  return (
    <section className="relative bg-gradient-warm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/60" />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 sm:py-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-primary font-medium">Tu cocina inteligente</span>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight shimmer-text">
              Organiza tus recetas Thermomix como nunca antes
            </h1>
            
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl">
              Guarda, organiza e importa tus recetas favoritas desde cualquier web. 
              Tu colección personal de sabores únicos, siempre a tu alcance.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={onGetStarted}
                className="text-lg px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <ChefHat className="mr-2 h-5 w-5" />
                Comenzar a cocinar
              </Button>

              <Button
                onClick={onViewFeatured}
                variant="outline"
                size="lg"
                className="text-lg px-8 py-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Heart className="mr-2 h-5 w-5" />
                Ver recetas destacadas
              </Button>
            </div>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-muted-foreground">Recetas guardadas</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">50+</div>
                <div className="text-muted-foreground">Sitios compatibles</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-muted-foreground">Acceso completo</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};