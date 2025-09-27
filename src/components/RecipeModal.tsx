import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Recipe } from "@/types/recipe";
import { Clock, Users, ChefHat, Share, Printer, Download, ChevronLeft, ChevronRight, ExternalLink, Play, Pause } from "lucide-react";
import { useState, useEffect } from "react";
import { resolveImageUrl } from "@/utils/api";
import { getSiteName, isValidUrl } from "@/utils/siteUtils";
import { isThermomixRecipe, hasThermomixSettings, getThermomixSettingsDisplay } from "@/utils/recipeUtils";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onRecipeUpdate?: (recipe: Recipe) => void;
}

export const RecipeModal = ({ recipe, isOpen, onClose, onRecipeUpdate }: RecipeModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [localRecipe, setLocalRecipe] = useState<Recipe | null>(recipe);
  const { toast } = useToast();

  // Update local recipe when prop changes
  useEffect(() => {
    setLocalRecipe(recipe);
  }, [recipe]);

  if (!localRecipe) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Fácil": return "bg-secondary text-secondary-foreground";
      case "Medio": return "bg-accent text-accent-foreground";
      case "Difícil": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const nextImage = () => {
    const imagesLength = recipe.images?.length ?? 0;
    if (imagesLength > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % imagesLength);
    }
  };

  const prevImage = () => {
    const imagesLength = recipe.images?.length ?? 0;
    if (imagesLength > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
    }
  };

  const generateTTSScript = async (recipe: Recipe): Promise<string> => {
    try {
      setIsGeneratingScript(true);

      const prompt = `Genera un script para explicar esta receta de cocina en un video. El script debe ser natural, entusiasta y fácil de seguir. NO te presentes ni menciones tu nombre, simplemente explica la receta directamente. Los datos de la receta son:

Título: ${recipe.title}
Descripción: ${recipe.description || 'Sin descripción'}
Tiempo de preparación: ${recipe.prepTime} minutos
Tiempo de cocción: ${recipe.cookTime || 'No especificado'} minutos
Porciones: ${recipe.servings}
Dificultad: ${recipe.difficulty}

Ingredientes:
${recipe.ingredients.map(ing => `- ${ing.amount} ${ing.unit || ''} ${ing.name}`).join('\n')}

Instrucciones:
${recipe.instructions.map((inst, idx) => `${idx + 1}. ${inst.description}`).join('\n')}

Genera un script natural y conversacional explicando la receta paso a paso. Comienza directamente con la receta sin presentarte. Que sea fluido y agradable de escuchar.`;

      const response = await api.llm.generateScript(prompt);

      if (response && response.success && response.script) {
        return response.script;
      } else {
        throw new Error('Failed to generate script');
      }
    } catch (error) {
      console.error('Error generating TTS script:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el script automáticamente",
        variant: "destructive",
      });
      return '';
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const speakText = async (text: string) => {
    if (!text.trim()) {
      toast({
        title: "Sin contenido",
        description: "No hay texto para reproducir",
        variant: "destructive",
      });
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-AR';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => {
        setIsPlaying(false);
        toast({
          title: "Error de reproducción",
          description: "No se pudo reproducir el audio",
          variant: "destructive",
        });
      };

      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "No compatible",
        description: "TTS no es soportado en este navegador",
        variant: "destructive",
      });
    }
  };

  const handlePlayTTS = async () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    let scriptText = localRecipe.locution;

    if (!scriptText?.trim()) {
      scriptText = await generateTTSScript(localRecipe);

      if (scriptText) {
        try {
          const updatedRecipe = { ...localRecipe, locution: scriptText };
          await api.recipes.update(localRecipe.id, updatedRecipe);

          // Update local state to prevent regeneration
          setLocalRecipe(updatedRecipe);

          // Notify parent if callback provided
          if (onRecipeUpdate) {
            onRecipeUpdate(updatedRecipe);
          }
        } catch (error) {
          console.error('Error saving generated script:', error);
        }
      }
    }

    if (scriptText) {
      await speakText(scriptText);
    }
  };

  const currentImage = localRecipe.images?.[currentImageIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{localRecipe.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {currentImage ? (
            <div className="relative">
              <img
                src={resolveImageUrl(currentImage.url)}
                alt={currentImage.altText || localRecipe.title}
                className="w-full h-64 object-cover rounded-lg"
                crossOrigin="anonymous"
                loading="lazy"
              />
              <div className="absolute top-4 right-4">
                <Badge className={getDifficultyColor(localRecipe.difficulty)}>
                  {localRecipe.difficulty}
                </Badge>
              </div>

              {(localRecipe.images?.length ?? 0) > 1 && (
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
                    {currentImageIndex + 1} / {recipe.images?.length ?? 0}
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
                <span>{recipe.prepTime} min</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{recipe.servings}</span>
              </div>
              {isThermomixRecipe(recipe) && (
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  <span>Thermomix</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {recipe.sourceUrl && isValidUrl(recipe.sourceUrl) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.open(recipe.sourceUrl, '_blank')}
                  title={`Ver en ${getSiteName(recipe.sourceUrl)}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                title="Compartir"
              >
                <Share className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Imprimir"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                title="Descargar"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayTTS}
                disabled={isGeneratingScript}
                title={isPlaying ? "Pausar audio" : "Reproducir receta"}
              >
                {isGeneratingScript ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground leading-relaxed">
              {recipe.description || 'Sin descripción disponible'}
            </p>
            {recipe.sourceUrl && isValidUrl(recipe.sourceUrl) && (
              <p className="text-xs text-muted-foreground mt-2">
                <span>Fuente: </span>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {getSiteName(recipe.sourceUrl)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
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
                      {hasThermomixSettings(instruction) && (
                        <div className="flex gap-4 mt-1 text-sm text-primary">
                          {getThermomixSettingsDisplay(instruction).map((setting, index) => (
                            <span key={index}>{setting}</span>
                          ))}
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