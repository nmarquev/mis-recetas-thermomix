import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Recipe } from "@/types/recipe";
import { Clock, Users, ChefHat, Share, Printer, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { resolveImageUrl } from "@/utils/api";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RecipeModal = ({ recipe, isOpen, onClose }: RecipeModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!recipe) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Fácil": return "bg-secondary text-secondary-foreground";
      case "Medio": return "bg-accent text-accent-foreground";
      case "Difícil": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const nextImage = () => {
    if (recipe.images && recipe.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % recipe.images.length);
    }
  };

  const prevImage = () => {
    if (recipe.images && recipe.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + recipe.images.length) % recipe.images.length);
    }
  };

  const currentImage = recipe.images?.[currentImageIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {currentImage ? (
            <div className="relative">
              <img
                src={resolveImageUrl(currentImage.url)}
                alt={currentImage.altText || recipe.title}
                className="w-full h-64 object-cover rounded-lg"
                crossOrigin="anonymous"
                loading="lazy"
              />
              <div className="absolute top-4 right-4">
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {recipe.difficulty}
                </Badge>
              </div>

              {recipe.images && recipe.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {currentImageIndex + 1} / {recipe.images.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Sin imagen</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{recipe.prepTime} minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{recipe.servings} personas</span>
              </div>
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                <span>Thermomix</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-1" />
                Compartir
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Descargar
              </Button>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground leading-relaxed">
              {recipe.description || 'Sin descripción disponible'}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Etiquetas</h3>
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => {
                // Handle both string tags and object tags from database
                const tagValue = typeof tag === 'string' ? tag : tag.tag || tag.name || String(tag);
                const tagKey = typeof tag === 'string' ? tag : `${tag.tagId || tag.id || index}-${tagValue}`;

                return (
                  <Badge key={tagKey} variant="outline">
                    {tagValue}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Ingredientes ({recipe.ingredients?.length || 0})</h3>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <ul className="space-y-2 text-muted-foreground">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>
                      <span className="font-medium">{ingredient.amount} {ingredient.unit}</span> {ingredient.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No hay ingredientes especificados</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Preparación ({recipe.instructions?.length || 0} pasos)</h3>
            {recipe.instructions && recipe.instructions.length > 0 ? (
              <ol className="space-y-3 text-muted-foreground">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {instruction.step || index + 1}
                    </span>
                    <div className="flex-1">
                      <p>{instruction.description}</p>
                      {instruction.thermomixSettings && (
                        <div className="flex gap-4 mt-1 text-sm text-primary">
                          {instruction.thermomixSettings.time && (
                            <span>⏱️ {instruction.thermomixSettings.time}</span>
                          )}
                          {instruction.thermomixSettings.temperature && (
                            <span>🌡️ {instruction.thermomixSettings.temperature}</span>
                          )}
                          {instruction.thermomixSettings.speed && (
                            <span>⚡ {instruction.thermomixSettings.speed}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">No hay instrucciones especificadas</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};