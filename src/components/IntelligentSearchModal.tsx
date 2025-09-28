import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Search,
  ExternalLink,
  Clock,
  Users,
  ChefHat,
  Save,
  X,
  MoreHorizontal,
  Settings
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl, resolveImageUrl } from '@/utils/api';

interface IntelligentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeSaved?: (recipeId: string) => void;
  onViewRecipe?: (recipe: any) => void;
}

interface SearchedRecipe {
  title: string;
  description: string;
  sourceUrl: string;
  siteName: string;
  foundAt: string;
  images: Array<{ url: string; altText?: string }>;
  ingredients: Array<{ name: string; amount: string; unit?: string }>;
  instructions: Array<{
    step: number;
    description: string;
    thermomixSettings?: {
      time?: string;
      temperature?: string;
      speed?: string;
    };
  }>;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  recipeType?: string;
  tags?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

type SearchStep = 'input' | 'searching' | 'results';

export const IntelligentSearchModal = ({ isOpen, onClose, onRecipeSaved, onViewRecipe }: IntelligentSearchModalProps) => {
  // State management
  const [currentStep, setCurrentStep] = useState<SearchStep>('input');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedRecipe[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Set<string>>(new Set());

  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [savingRecipeIndex, setSavingRecipeIndex] = useState<number | null>(null);

  // Error handling
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // Note: Using resolveImageUrl from @/utils/api for consistent image handling

  const resetModal = () => {
    setCurrentStep('input');
    setQuery('');
    setSearchResults([]);
    setCurrentOffset(0);
    setHasMore(false);
    setSavedRecipes(new Set());
    setIsSearching(false);
    setSavingRecipeIndex(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSearch = async (isLoadMore: boolean = false) => {
    if (!query.trim()) {
      toast({
        title: "Consulta requerida",
        description: "Por favor ingresa una consulta de búsqueda",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setError(null);

    const offset = isLoadMore ? currentOffset + 3 : 0;

    try {
      console.log('🔍 Searching recipes with AI:', { query, offset });

      const response = await api.llm.searchRecipes(query, 3, offset);

      if (response.success && response.recipes) {
        const newRecipes = response.recipes as SearchedRecipe[];

        if (isLoadMore) {
          setSearchResults(prev => [...prev, ...newRecipes]);
        } else {
          setSearchResults(newRecipes);
          setCurrentStep('results');
        }

        setCurrentOffset(offset);
        setHasMore(response.hasMore || false);

        console.log('✅ Search successful:', newRecipes.length, 'recipes found');

        toast({
          title: "🎯 Búsqueda exitosa",
          description: `Encontradas ${newRecipes.length} recetas con IA`,
        });

      } else {
        throw new Error(response.error || 'Error en la búsqueda');
      }

    } catch (error: any) {
      console.error('❌ Search error:', error);
      setError(error.message || 'Error al buscar recetas con IA');
      toast({
        title: "Error de búsqueda",
        description: error.message || 'No se pudieron encontrar recetas',
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveRecipe = async (recipe: SearchedRecipe, index: number) => {
    if (savedRecipes.has(recipe.title)) return;

    setSavingRecipeIndex(index);
    setError(null);

    try {
      console.log('💾 Saving AI-found recipe:', recipe.title);

      const recipeData = {
        title: recipe.title,
        description: recipe.description || 'Receta encontrada con búsqueda inteligente',
        ingredients: recipe.ingredients.map((ing, idx) => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit || "",
          order: idx + 1
        })),
        instructions: recipe.instructions.map(inst => ({
          step: inst.step,
          description: inst.description,
          time: inst.thermomixSettings?.time || "",
          temperature: inst.thermomixSettings?.temperature || "",
          speed: inst.thermomixSettings?.speed || ""
        })),
        prepTime: recipe.prepTime || 30,
        cookTime: recipe.cookTime || null,
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty || 'Medio',
        recipeType: recipe.recipeType || 'Otro',
        tags: recipe.tags || ['ia-search'],

        // Nutritional information
        calories: recipe.nutritionalInfo?.calories || null,
        protein: recipe.nutritionalInfo?.protein || null,
        carbohydrates: recipe.nutritionalInfo?.carbohydrates || null,
        fat: recipe.nutritionalInfo?.fat || null,
        fiber: recipe.nutritionalInfo?.fiber || null,
        sugar: recipe.nutritionalInfo?.sugar || null,
        sodium: recipe.nutritionalInfo?.sodium || null,

        images: recipe.images.map((img, idx) => ({
          url: img.url,
          localPath: undefined,
          order: idx + 1,
          altText: img.altText || `Imagen de ${recipe.title}`
        })),
        sourceUrl: recipe.sourceUrl
      };

      const savedRecipe = await api.recipes.create(recipeData);
      console.log('✅ Recipe saved successfully:', savedRecipe.id);

      // Mark as saved
      setSavedRecipes(prev => new Set([...prev, recipe.title]));
      onRecipeSaved?.(savedRecipe.id);

      toast({
        title: "🎉 Receta guardada",
        description: `"${recipe.title}" se agregó a tu colección`,
        action: onViewRecipe ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewRecipe(savedRecipe)}
          >
            Ver receta
          </Button>
        ) : undefined,
      });

    } catch (error: any) {
      console.error('❌ Save recipe error:', error);
      setError(error.message || 'Error al guardar la receta');
      toast({
        title: "Error al guardar",
        description: error.message || 'No se pudo guardar la receta',
        variant: "destructive"
      });
    } finally {
      setSavingRecipeIndex(null);
    }
  };

  const exampleQueries = [
    "postres veganos con chocolate",
    "recetas mediterráneas saludables",
    "comidas rápidas para niños",
    "platos principales con pollo",
    "smoothies energéticos",
    "recetas sin gluten fáciles"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span>Búsqueda Inteligente de Recetas</span>
          </DialogTitle>

          <p className="text-muted-foreground">
            Usa inteligencia artificial para encontrar recetas reales desde sitios web
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search Input */}
          {currentStep === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">¿Qué tipo de recetas buscas?</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ej: postres con chocolate amargo bajas en calorías"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                      disabled={isSearching}
                    />
                  </div>
                  <Button
                    onClick={() => handleSearch()}
                    disabled={isSearching || !query.trim()}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    {isSearching ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span className="ml-2">Buscar con IA</span>
                  </Button>
                </div>
              </div>

              {/* Example queries */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Ejemplos populares:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleQueries.map((example, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setQuery(example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Searching State */}
          {currentStep === 'searching' || isSearching && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Sparkles className="h-6 w-6 text-orange-500 animate-pulse" />
                  <span className="text-lg font-medium">Buscando recetas con IA...</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Analizando sitios web de cocina para encontrar: "{query}"
                </p>
              </div>

              {/* Loading skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {currentStep === 'results' && searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Recetas encontradas ({searchResults.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentStep('input');
                    setSearchResults([]);
                    setCurrentOffset(0);
                  }}
                >
                  Nueva búsqueda
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((recipe, index) => (
                  <div key={`${recipe.title}-${index}`} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Recipe Image */}
                    <div className="relative h-40">
                      {recipe.images?.[0]?.url ? (
                        <img
                          src={recipe.images[0].url}
                          alt={recipe.images[0].altText || recipe.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            console.log('🖼️ Image failed to load:', recipe.images[0].url);
                            const img = e.target as HTMLImageElement;
                            const container = img.parentElement;

                            // Hide the broken image
                            img.style.display = 'none';

                            // Add fallback background and content
                            if (container) {
                              container.className = 'relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center';
                              container.innerHTML = `
                                <div class="text-center">
                                  <svg class="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  <p class="text-xs text-gray-500 px-2">${recipe.title}</p>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <div className="text-center">
                            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 px-2">{recipe.title}</p>
                          </div>
                        </div>
                      )}

                      {/* Source badge */}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {recipe.siteName}
                        </Badge>
                      </div>
                    </div>

                    {/* Recipe Info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="font-semibold line-clamp-2 leading-5 h-10">
                          {recipe.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {recipe.description}
                        </p>
                      </div>

                      {/* Recipe meta */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {recipe.prepTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{recipe.prepTime}min</span>
                          </div>
                        )}
                        {recipe.servings && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{recipe.servings}</span>
                          </div>
                        )}
                        {recipe.difficulty && (
                          <Badge variant="outline" className="text-xs">
                            {recipe.difficulty}
                          </Badge>
                        )}
                      </div>

                      {/* Tags */}
                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recipe.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {recipe.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{recipe.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Nutrition Summary */}
                      {recipe.nutritionalInfo?.calories && (
                        <div className="bg-orange-50 border border-orange-200 rounded p-2">
                          <div className="text-xs text-orange-800 font-medium mb-1">Información Nutricional (por porción)</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Calorías:</span>
                              <span className="font-medium">{Math.round(recipe.nutritionalInfo.calories)}</span>
                            </div>
                            {recipe.nutritionalInfo.protein && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Proteína:</span>
                                <span className="font-medium">{recipe.nutritionalInfo.protein.toFixed(1)}g</span>
                              </div>
                            )}
                            {recipe.nutritionalInfo.carbohydrates && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Carbohidratos:</span>
                                <span className="font-medium">{recipe.nutritionalInfo.carbohydrates.toFixed(1)}g</span>
                              </div>
                            )}
                            {recipe.nutritionalInfo.fat && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Grasa:</span>
                                <span className="font-medium">{recipe.nutritionalInfo.fat.toFixed(1)}g</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Thermomix Settings Indicator */}
                      {recipe.instructions.some(inst => inst.thermomixSettings?.time || inst.thermomixSettings?.temperature || inst.thermomixSettings?.speed) && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-blue-800 font-medium">Compatible con Thermomix</span>
                          </div>
                          <div className="text-xs text-blue-700 mt-1">
                            Incluye configuraciones de tiempo, temperatura y velocidad
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveRecipe(recipe, index)}
                          disabled={savedRecipes.has(recipe.title) || savingRecipeIndex === index}
                          className="flex-1"
                        >
                          {savingRecipeIndex === index ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          ) : savedRecipes.has(recipe.title) ? (
                            "✓ Guardada"
                          ) : (
                            <>
                              <Save className="h-3 w-3 mr-2" />
                              Guardar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log('🔗 Opening recipe URL:', recipe.sourceUrl);
                            if (recipe.sourceUrl) {
                              try {
                                // Validate and clean the URL
                                let url = recipe.sourceUrl.trim();

                                // Add protocol if missing
                                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                  url = 'https://' + url;
                                }

                                console.log('🔗 Cleaned URL:', url);
                                window.open(url, '_blank', 'noopener,noreferrer');
                              } catch (error) {
                                console.error('🔗 Error opening URL:', error);
                                toast({
                                  title: "Error al abrir enlace",
                                  description: "No se pudo abrir la receta original",
                                  variant: "destructive"
                                });
                              }
                            } else {
                              console.error('🔗 No URL provided for recipe');
                              toast({
                                title: "Enlace no disponible",
                                description: "Esta receta no tiene un enlace original",
                                variant: "destructive"
                              });
                            }
                          }}
                          title="Ver receta original"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleSearch(true)}
                    disabled={isSearching}
                    className="bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100"
                  >
                    {isSearching ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mr-2" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                    )}
                    Buscar más recetas
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* No Results */}
          {currentStep === 'results' && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No se encontraron recetas</h3>
              <p className="text-muted-foreground mb-4">
                Intenta con una consulta diferente o más específica
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep('input');
                  setQuery('');
                }}
              >
                Intentar nueva búsqueda
              </Button>
            </div>
          )}
        </div>

        {/* Footer summary */}
        {searchResults.length > 0 && (
          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            <div className="flex justify-center items-center space-x-4">
              <span>🔍 "{query}"</span>
              <span>📊 {searchResults.length} encontradas</span>
              <span>✅ {savedRecipes.size} guardadas</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};