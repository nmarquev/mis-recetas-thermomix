import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { FileText, Upload, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { PdfUploadResponse } from '@/types/pdf';

interface PdfUploaderProps {
  onUploadSuccess: (result: PdfUploadResponse) => void;
  loading: boolean;
}

export const PdfUploader = ({ onUploadSuccess, loading }: PdfUploaderProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setUploadProgress(0);

    try {
      console.log('📄 Starting PDF upload:', file.name, `(${Math.round(file.size / 1024 / 1024 * 100) / 100} MB)`);

      // Show upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { api } = await import('@/services/api');
      const result = await api.pdf.upload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setPreview(result.preview);

      console.log('✅ PDF upload successful:', result);
      onUploadSuccess(result);

    } catch (error: any) {
      console.error('❌ PDF upload error:', error);
      setError(error.message || 'Error al subir el archivo PDF');
      setUploadProgress(0);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: loading
  });

  const uploadedFile = acceptedFiles[0];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Subir Documento PDF</h3>
        <p className="text-muted-foreground">
          Sube tu archivo PDF con recetas para extraer automáticamente usando análisis visual e inteligencia artificial
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }
          ${loading ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="space-y-4">
          <div className="flex justify-center">
            {uploadProgress > 0 && uploadProgress < 100 ? (
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : uploadedFile ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <Upload className="w-12 h-12 text-muted-foreground" />
            )}
          </div>

          <div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Procesando archivo...</p>
            ) : isDragActive ? (
              <p className="text-sm text-primary">Suelta el archivo PDF aquí</p>
            ) : uploadedFile ? (
              <div className="space-y-2">
                <p className="font-medium text-green-700">✅ {uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(uploadedFile.size / 1024 / 1024 * 100) / 100} MB
                </p>
              </div>
            ) : (
              <>
                <p className="font-medium">Arrastra y suelta tu archivo PDF</p>
                <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
              </>
            )}
          </div>

          {!uploadedFile && !loading && (
            <Button variant="outline" disabled={loading}>
              <FileText className="w-4 h-4 mr-2" />
              Seleccionar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subiendo y procesando...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Vista previa de la primera página:</span>
              </div>
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="PDF Preview"
                  className="max-w-sm max-h-64 object-contain border rounded shadow-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* File Requirements */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>📋 <strong>Requisitos:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Formato: PDF únicamente</li>
          <li>Tamaño máximo: 50 MB</li>
          <li>Contenido: Documentos con recetas estructuradas</li>
          <li>Calidad: Texto e imágenes legibles para mejor extracción</li>
        </ul>
      </div>
    </div>
  );
};