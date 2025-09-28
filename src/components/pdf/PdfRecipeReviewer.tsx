import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  SkipForward,
  Clock,
  Users,
  ChefHat,
  FileText,
  CheckCircle,
  Eye,
  EyeOff,
  Image,
  MapPin
} from "lucide-react";
import { PdfExtractedRecipe } from "@/types/pdf";

interface PdfRecipeReviewerProps {
  recipe: PdfExtractedRecipe;
  recipeIndex: number;
  totalRecipes: number;
  isSaved: boolean;
  onSave: () => void;
  onSkip: () => void;
  loading: boolean;
}

export const PdfRecipeReviewer = ({
  recipe,
  recipeIndex,
  totalRecipes,
  isSaved,
  onSave,
  onSkip,
  loading
}: PdfRecipeReviewerProps) => {
  const [showRawContent, setShowRawContent] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);

  const estimatedData = recipe.estimatedData;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">
          Revisar Receta {recipeIndex + 1} de {totalRecipes}
        </h3>
        <p className="text-muted-foreground">
          Revisa los datos extraídos visualmente por GPT-5-mini y guarda la receta si está correcta
        </p>
      </div>

      {/* Recipe Preview with Visual Elements */}
      <Card className={isSaved ? "border-green-200 bg-green-50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <ChefHat className="h-5 w-5" />
              <span>{estimatedData?.title || recipe.title}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {recipe.hasImage && (
                <Badge variant="outline" className="border-purple-500 text-purple-700">
                  <Image className="h-3 w-3 mr-1" />
                  Con Imagen
                </Badge>
              )}
              {recipe.pageNumbers && recipe.pageNumbers.length > 0 && (
                <Badge variant="outline" className="border-blue-500 text-blue-700">
                  <MapPin className="h-3 w-3 mr-1" />
                  Págs. {recipe.pageNumbers.join(', ')}
                </Badge>
              )}
              {isSaved && (
                <Badge variant="outline" className="border-green-500 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Guardada
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Thumbnail Preview */}
          {recipe.thumbnailUrl && showThumbnail && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Página de Origen
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowThumbnail(!showThumbnail)}
                >
                  {showThumbnail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-center">
                <img
                  src={recipe.thumbnailUrl}
                  alt={`Página con receta: ${recipe.title}`}
                  className="max-w-sm max-h-48 object-contain border rounded shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Basic Info */}
          {estimatedData?.description && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Descripción
              </h4>
              <p className="text-sm">{estimatedData.description}</p>
            </div>
          )}

          {/* Recipe Meta with Visual Indicators */}
          <div className="flex flex-wrap gap-4 text-sm">
            {estimatedData?.prepTime && (
              <div className="flex items-center space-x-1 bg-orange-50 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>{estimatedData.prepTime} min preparación</span>
                <span className="text-xs text-orange-600">(🔍 detectado visualmente)</span>
              </div>
            )}
            {estimatedData?.cookTime && (
              <div className="flex items-center space-x-1 bg-red-50 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-red-500" />
                <span>{estimatedData.cookTime} min cocción</span>
                <span className="text-xs text-red-600">(🔍 detectado visualmente)</span>
              </div>
            )}
            {estimatedData?.servings && (
              <div className="flex items-center space-x-1 bg-green-50 px-3 py-1 rounded-full">
                <Users className="h-4 w-4 text-green-500" />
                <span>{estimatedData.servings} porciones</span>
                <span className="text-xs text-green-600">(🔍 detectado visualmente)</span>
              </div>
            )}
          </div>

          {/* Ingredients */}
          {estimatedData?.ingredients && estimatedData.ingredients.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Ingredientes ({estimatedData.ingredients.length})
                <span className="text-xs normal-case ml-2 text-blue-600">✨ Extraídos con IA visual</span>
              </h4>
              <div className="space-y-1">
                {estimatedData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>
                      {typeof ingredient === 'string'
                        ? ingredient
                        : ingredient.amount && ingredient.name
                          ? `${ingredient.amount} ${ingredient.unit || ''} ${ingredient.name}`.trim()
                          : JSON.stringify(ingredient)
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {estimatedData?.instructions && estimatedData.instructions.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Instrucciones ({estimatedData.instructions.length} pasos)
                <span className="text-xs normal-case ml-2 text-purple-600">✨ Extraídas con IA visual</span>
              </h4>
              <div className="space-y-3">
                {estimatedData.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start space-x-3 text-sm">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <span>{typeof instruction === 'string' ? instruction : instruction.description || JSON.stringify(instruction)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Content Toggle */}
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRawContent(!showRawContent)}
              className="text-muted-foreground"
            >
              {showRawContent ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showRawContent ? 'Ocultar contenido procesado' : 'Ver contenido procesado'}
            </Button>

            {showRawContent && (
              <div className="mt-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Contenido Procesado del PDF
                </h4>
                <Textarea
                  value={recipe.content}
                  readOnly
                  className="min-h-[200px] font-mono text-xs resize-none"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Quality Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <FileText className="h-4 w-4" />
            <span>Calidad de Extracción Visual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {estimatedData?.title ? '✓' : '⚠️'}
              </div>
              <div className="text-xs text-muted-foreground">Título</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {estimatedData?.ingredients?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Ingredientes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {estimatedData?.instructions?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Pasos</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {(estimatedData?.prepTime || estimatedData?.cookTime) ? '🔍✓' : '⚠️'}
              </div>
              <div className="text-xs text-muted-foreground">Tiempos Visuales</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {recipe.hasImage ? '🖼️✓' : '❌'}
              </div>
              <div className="text-xs text-muted-foreground">Imágenes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Warnings */}
      {(!estimatedData?.ingredients || estimatedData.ingredients.length === 0) && (
        <Alert>
          <AlertDescription>
            <strong>Advertencia:</strong> No se detectaron ingredientes en esta receta.
            Esto puede indicar que la página no contiene una receta completa o que el formato
            no fue reconocido por el análisis visual. Revisa el contenido procesado.
          </AlertDescription>
        </Alert>
      )}

      {(!estimatedData?.instructions || estimatedData.instructions.length === 0) && (
        <Alert>
          <AlertDescription>
            <strong>Advertencia:</strong> No se detectaron instrucciones en esta receta.
            Revisa el contenido procesado y considera editarla manualmente después de guardarla.
          </AlertDescription>
        </Alert>
      )}

      {(!estimatedData?.prepTime && !estimatedData?.cookTime && !estimatedData?.servings) && (
        <Alert>
          <AlertDescription>
            <strong>Información:</strong> No se detectaron iconos visuales de tiempo o porciones.
            Si el documento contiene estos iconos, pueden estar en un formato que la IA no reconoció.
            Los tiempos y porciones se pueden agregar manualmente después.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          size="lg"
          onClick={onSkip}
          disabled={loading}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Saltar Esta Receta
        </Button>

        <Button
          size="lg"
          onClick={onSave}
          disabled={loading || isSaved}
          className="px-8"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Guardando...
            </>
          ) : isSaved ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Ya Guardada
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Receta
            </>
          )}
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="text-center text-sm text-muted-foreground">
        Receta {recipeIndex + 1} de {totalRecipes}
        {recipeIndex < totalRecipes - 1 && (
          <span> • {totalRecipes - recipeIndex - 1} restantes</span>
        )}
        {recipe.pageNumbers && recipe.pageNumbers.length > 0 && (
          <span> • Página{recipe.pageNumbers.length > 1 ? 's' : ''} {recipe.pageNumbers.join(', ')} del PDF</span>
        )}
      </div>
    </div>
  );
};