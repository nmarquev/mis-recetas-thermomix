import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ChefHat, FileText, Zap, ArrowRight, Eye, Image, Clock, Users } from 'lucide-react';
import { PdfUploadResponse, PageRange } from '@/types/pdf';

interface PdfRecipeExtractorProps {
  uploadData: PdfUploadResponse;
  selectedPages: PageRange;
  onExtract: () => void;
  loading: boolean;
}

export const PdfRecipeExtractor = ({
  uploadData,
  selectedPages,
  onExtract,
  loading
}: PdfRecipeExtractorProps) => {
  const pagesCount = selectedPages.end - selectedPages.start + 1;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Extraer recetas del PDF</h3>
        <p className="text-muted-foreground">
          Procesaremos las páginas {selectedPages.start} a {selectedPages.end} para detectar recetas automáticamente
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


      {/* Processing Indicators */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <ChefHat className="h-6 w-6 text-blue-600 animate-pulse" />
                <div className="flex-1">
                  <h4 className="font-medium">Procesando páginas...</h4>
                  <p className="text-sm text-muted-foreground">
                    Analizando {pagesCount} páginas para extraer recetas
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
            <strong>Procesamiento extenso:</strong> {pagesCount} páginas pueden tomar varios minutos.
            Considera procesar en secciones más pequeñas para mayor rapidez.
          </AlertDescription>
        </Alert>
      )}

      {pagesCount > 25 && !loading && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Advertencia:</strong> Más de 25 páginas puede resultar en timeouts.
            Se recomienda dividir en rangos de 10-15 páginas.
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