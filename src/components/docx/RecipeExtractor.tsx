import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ChefHat, FileText, Zap, ArrowRight } from "lucide-react";
import { DocxUploadResponse, PageRange } from "@/types/docx";

interface RecipeExtractorProps {
  uploadData: DocxUploadResponse;
  selectedPages: PageRange;
  onExtract: () => void;
  loading: boolean;
}

export const RecipeExtractor = ({
  uploadData,
  selectedPages,
  onExtract,
  loading
}: RecipeExtractorProps) => {
  const pagesCount = selectedPages.end - selectedPages.start + 1;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Listo para extraer recetas</h3>
        <p className="text-muted-foreground">
          Procesaremos las páginas {selectedPages.start} a {selectedPages.end} para detectar y extraer recetas automáticamente
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Resumen del Procesamiento</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{uploadData.totalPages}</div>
              <div className="text-sm text-muted-foreground">Total de páginas</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{pagesCount}</div>
              <div className="text-sm text-muted-foreground">Páginas a procesar</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">?</div>
              <div className="text-sm text-muted-foreground">Recetas detectadas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>¿Cómo funciona el proceso?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
                1
              </div>
              <div>
                <h4 className="font-medium">Análisis de texto</h4>
                <p className="text-sm text-muted-foreground">
                  Extraemos el texto del documento Word y lo analizamos para detectar patrones de recetas
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-semibold text-green-600">
                2
              </div>
              <div>
                <h4 className="font-medium">Detección automática</h4>
                <p className="text-sm text-muted-foreground">
                  Identificamos títulos, listas de ingredientes e instrucciones usando inteligencia artificial
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-semibold text-purple-600">
                3
              </div>
              <div>
                <h4 className="font-medium">Estructuración de datos</h4>
                <p className="text-sm text-muted-foreground">
                  Organizamos la información extraída en formato de receta con ingredientes, pasos y tiempos
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs font-semibold text-orange-600">
                4
              </div>
              <div>
                <h4 className="font-medium">Revisión individual</h4>
                <p className="text-sm text-muted-foreground">
                  Podrás revisar y editar cada receta antes de guardarla en tu colección
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Indicators */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <ChefHat className="h-6 w-6 text-blue-600 animate-pulse" />
                <div className="flex-1">
                  <h4 className="font-medium">Procesando recetas...</h4>
                  <p className="text-sm text-muted-foreground">
                    Esto puede tomar unos momentos dependiendo del número de páginas
                  </p>
                </div>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {pagesCount > 15 && !loading && (
        <Alert>
          <AlertDescription>
            <strong>Nota:</strong> Procesarás {pagesCount} páginas, lo que puede tomar varios minutos.
            Para un procesamiento más rápido, considera dividir el documento en rangos más pequeños.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onExtract}
          disabled={loading}
          className="px-8"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Procesando...
            </>
          ) : (
            <>
              <ChefHat className="h-4 w-4 mr-2" />
              Extraer Recetas
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};