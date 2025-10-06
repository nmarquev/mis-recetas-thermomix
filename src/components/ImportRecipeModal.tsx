import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { ImportRecipeResponse, Recipe } from '@/types/recipe';
import { Loader2, Globe, Clock, Users, ChefHat, X, Check } from 'lucide-react';
import { resolveImageUrl } from '@/utils/api';
import { EditRecipeModal } from '@/components/EditRecipeModal';

interface ImportRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (recipe: Recipe) => void;
  onViewRecipe?: (recipe: Recipe) => void;
}

export const ImportRecipeModal = ({ isOpen, onClose, onImportSuccess, onViewRecipe }: ImportRecipeModalProps) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importedRecipe, setImportedRecipe] = useState<ImportRecipeResponse['recipe'] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!url.trim()) {
      toast({
        title: "URL requerida",
        description: "Por favor ingresa una URL válida",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.import.fromUrl(url);

      if (response.success && response.recipe) {
        setImportedRecipe(response.recipe);
        toast({
          title: "¡Receta importada!",
          description: `Se importó: ${response.recipe.title}`,
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error al importar",
        description: error instanceof Error ? error.message : "No se pudo importar la receta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!importedRecipe) return;

    setIsLoading(true);

    try {
      const savedRecipe = await api.recipes.create({
        title: importedRecipe.title,
        description: importedRecipe.description,
        images: importedRecipe.images,
        prepTime: importedRecipe.prepTime,
        cookTime: importedRecipe.cookTime,
        servings: importedRecipe.servings,
        difficulty: importedRecipe.difficulty,
        tags: importedRecipe.tags,
        ingredients: importedRecipe.ingredients,
        instructions: importedRecipe.instructions,
        sourceUrl: importedRecipe.sourceUrl,
        recipeType: importedRecipe.recipeType
      });

      onImportSuccess(savedRecipe);
      handleClose();

      toast({
        title: "¡Receta guardada!",
        description: "La receta se ha guardado exitosamente en tu colección",
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
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la receta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setImportedRecipe(null);
    setIsEditing(false);
    onClose();
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (!importedRecipe) return;

    setImportedRecipe({
      ...importedRecipe,
      images: importedRecipe.images.filter((_, index) => index !== indexToRemove)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Importar Receta desde URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL Input Section */}
          {!importedRecipe && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipe-url">URL de la receta</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="recipe-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://ejemplo.com/mi-receta"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleImport}
                    disabled={isLoading || !url.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      'Importar'
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Pega la URL de una receta y nuestro sistema la analizará automáticamente para extraer:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Nombre y descripción de la receta</li>
                  <li>Lista de ingredientes con cantidades</li>
                  <li>Instrucciones paso a paso</li>
                  <li>Tiempo de preparación y dificultad</li>
                  <li>Hasta 3 imágenes de la receta</li>
                </ul>
              </div>
            </div>
          )}

          {/* Recipe Preview Section */}
          {importedRecipe && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Vista previa de la receta</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Ver' : 'Editar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setImportedRecipe(null)}
                  >
                    Volver
                  </Button>
                </div>
              </div>

              {/* Recipe Images */}
              {(importedRecipe.images?.length ?? 0) > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Imágenes ({importedRecipe.images?.length ?? 0})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(importedRecipe.images || []).map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={resolveImageUrl(image.url)}
                          alt={image.altText || `Imagen ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                          crossOrigin="anonymous"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to original URL if local image fails
                            e.currentTarget.src = resolveImageUrl(image.url);
                          }}
                        />
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipe Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recipe-title">Título</Label>
                    {isEditing ? (
                      <Input
                        id="recipe-title"
                        value={importedRecipe.title}
                        onChange={(e) => setImportedRecipe({
                          ...importedRecipe,
                          title: e.target.value
                        })}
                      />
                    ) : (
                      <h2 className="text-xl font-semibold">{importedRecipe.title}</h2>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="recipe-description">Descripción</Label>
                    {isEditing ? (
                      <Textarea
                        id="recipe-description"
                        value={importedRecipe.description || ''}
                        onChange={(e) => setImportedRecipe({
                          ...importedRecipe,
                          description: e.target.value
                        })}
                        rows={3}
                      />
                    ) : (
                      <p className="text-muted-foreground">{importedRecipe.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{importedRecipe.prepTime} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{importedRecipe.servings} personas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ChefHat className="h-4 w-4" />
                      <span>{importedRecipe.difficulty}</span>
                    </div>
                  </div>

                  <div>
                    <Label>Etiquetas</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {importedRecipe.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>

                  {importedRecipe.recipeType && (
                    <div>
                      <Label>Tipo de receta</Label>
                      <p className="text-sm text-muted-foreground">{importedRecipe.recipeType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Nutritional Information */}
              {importedRecipe.nutritionalInfo && (
                <div>
                  <h4 className="font-medium mb-2">Información Nutricional (por porción)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{importedRecipe.nutritionalInfo.calories}</div>
                      <div className="text-xs text-muted-foreground">Calorías</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{importedRecipe.nutritionalInfo.protein}g</div>
                      <div className="text-xs text-muted-foreground">Proteínas</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{importedRecipe.nutritionalInfo.carbohydrates}g</div>
                      <div className="text-xs text-muted-foreground">Carbohidratos</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold">{importedRecipe.nutritionalInfo.fat}g</div>
                      <div className="text-xs text-muted-foreground">Grasas</div>
                    </div>
                    {importedRecipe.nutritionalInfo.fiber && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">{importedRecipe.nutritionalInfo.fiber}g</div>
                        <div className="text-xs text-muted-foreground">Fibra</div>
                      </div>
                    )}
                    {importedRecipe.nutritionalInfo.sugar && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">{importedRecipe.nutritionalInfo.sugar}g</div>
                        <div className="text-xs text-muted-foreground">Azúcar</div>
                      </div>
                    )}
                    {importedRecipe.nutritionalInfo.sodium && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">{importedRecipe.nutritionalInfo.sodium}mg</div>
                        <div className="text-xs text-muted-foreground">Sodio</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              <div>
                <h4 className="font-medium mb-2">Ingredientes ({importedRecipe.ingredients.length})</h4>
                <div className="space-y-4">
                  {(() => {
                    // Group ingredients by section
                    const grouped = new Map<string | null, typeof importedRecipe.ingredients>();
                    importedRecipe.ingredients.forEach(ing => {
                      const section = (ing as any).section || null;
                      if (!grouped.has(section)) {
                        grouped.set(section, []);
                      }
                      grouped.get(section)!.push(ing);
                    });

                    return Array.from(grouped.entries()).map(([section, ingredients], sectionIndex) => (
                      <div key={sectionIndex}>
                        {section && (
                          <h5 className="font-medium text-primary text-sm mb-2">{section}</h5>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {ingredients.map((ingredient, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              <span className="font-medium">{ingredient.amount} {ingredient.unit}</span>
                              <span>{ingredient.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="font-medium mb-2">Instrucciones ({importedRecipe.instructions.length} pasos)</h4>
                <div className="space-y-4">
                  {(() => {
                    // Group instructions by section
                    const grouped = new Map<string | null, typeof importedRecipe.instructions>();

                    // Debug logging
                    console.log('📋 ImportRecipeModal - Instructions data:', {
                      total: importedRecipe.instructions.length,
                      firstInstruction: importedRecipe.instructions[0],
                      hasSection: importedRecipe.instructions.some(inst => (inst as any).section)
                    });

                    importedRecipe.instructions.forEach(inst => {
                      const section = (inst as any).section || null;
                      if (!grouped.has(section)) {
                        grouped.set(section, []);
                      }
                      grouped.get(section)!.push(inst);
                    });

                    console.log('📋 Grouped instructions:', {
                      sections: Array.from(grouped.keys()),
                      counts: Array.from(grouped.entries()).map(([s, insts]) => ({ section: s || '(none)', count: insts.length }))
                    });

                    return Array.from(grouped.entries()).map(([section, instructions], sectionIndex) => (
                      <div key={sectionIndex}>
                        {section && (
                          <h5 className="font-medium text-primary text-sm mb-2">{section}</h5>
                        )}
                        <div className="space-y-3">
                          {instructions.map((instruction) => (
                            <div key={instruction.step} className="flex gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                {instruction.step}
                              </div>
                              <p className="text-sm text-muted-foreground flex-1">{instruction.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    Editar antes de guardar
                  </Button>
                  <Button
                    onClick={handleSaveRecipe}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Guardar Receta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Edit Recipe Modal */}
      {importedRecipe && (
        <EditRecipeModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          recipe={importedRecipe as any}
          onRecipeUpdated={(updatedRecipe) => {
            setImportedRecipe(updatedRecipe as any);
            setIsEditing(false);
            toast({
              title: "Receta actualizada",
              description: "Los cambios se guardarán cuando presiones 'Guardar Receta'",
            });
          }}
        />
      )}
    </Dialog>
  );
};