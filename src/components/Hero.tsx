import { Button } from "@/components/ui/button";
import { ChefHat, Heart, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-kitchen.jpg";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative bg-gradient-warm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/60" />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 sm:py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-primary font-medium">Tu cocina inteligente</span>
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-bold text-foreground leading-tight">
              Organiza tus{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                recetas Thermomix
              </span>{" "}
              como nunca antes
            </h1>
            
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl">
              Guarda, organiza e importa tus recetas favoritas desde cualquier web. 
              Tu colección personal de sabores únicos, siempre a tu alcance.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={onGetStarted}
                variant="hero"
                size="lg"
                className="text-lg px-8 py-3"
              >
                <ChefHat className="mr-2 h-5 w-5" />
                Comenzar a cocinar
              </Button>
              
              <Button 
                variant="secondary" 
                size="lg"
                className="text-lg px-8 py-3"
              >
                <Heart className="mr-2 h-5 w-5" />
                Ver recetas destacadas
              </Button>
            </div>
            
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
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