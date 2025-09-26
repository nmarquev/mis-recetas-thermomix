import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { FileText, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { DocxImportState, PageRange, DocxExtractedRecipe } from "@/types/docx";
import { api } from "@/services/api";
import { FileUploader } from "./docx/FileUploader";
import { PageSelector } from "./docx/PageSelector";
import { RecipeExtractor } from "./docx/RecipeExtractor";
import { RecipeReviewer } from "./docx/RecipeReviewer";

interface DocxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeSaved?: (recipeId: string) => void;
}

export const DocxImportModal = ({ isOpen, onClose, onRecipeSaved }: DocxImportModalProps) => {
  const [state, setState] = useState<DocxImportState>({
    currentStep: 'upload',
    currentRecipeIndex: 0,
    loading: false,
    savedRecipes: []
  });

  const resetState = useCallback(() => {
    setState({
      currentStep: 'upload',
      currentRecipeIndex: 0,
      loading: false,
      savedRecipes: []
    });
  }, []);

  const handleClose = useCallback(() => {
    if (!state.loading) {
      resetState();
      onClose();
    }
  }, [state.loading, resetState, onClose]);

  // Step 1: File Upload
  const handleFileUpload = async (file: File) => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      console.log('📤 Uploading DOCX file:', file.name);
      const uploadResponse = await api.docx.upload(file);

      if (uploadResponse.success) {
        setState(prev => ({
          ...prev,
          uploadData: uploadResponse,
          currentStep: 'select-pages',
          loading: false
        }));
      } else {
        throw new Error(uploadResponse.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to upload file'
      }));
    }
  };

  // Step 2: Page Selection
  const handlePageSelection = (pageRange: PageRange) => {
    setState(prev => ({
      ...prev,
      selectedPages: pageRange,
      currentStep: 'extract'
    }));
  };

  // Step 3: Extract Recipes
  const handleExtractRecipes = async () => {
    if (!state.uploadData || !state.selectedPages) return;

    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      console.log('🔍 Extracting recipes from pages:', state.selectedPages);
      const extractResponse = await api.docx.extract(
        state.uploadData.fileId,
        state.selectedPages.start,
        state.selectedPages.end
      );

      if (extractResponse.success && extractResponse.recipes.length > 0) {
        setState(prev => ({
          ...prev,
          extractedRecipes: extractResponse.recipes,
          currentStep: 'review',
          currentRecipeIndex: 0,
          loading: false
        }));
      } else {
        throw new Error(extractResponse.error || 'No recipes found in selected pages');
      }
    } catch (error: any) {
      console.error('❌ Extract error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to extract recipes'
      }));
    }
  };

  // Step 4: Recipe Review and Save
  const handleRecipeSave = async (recipe: DocxExtractedRecipe) => {
    if (!recipe.estimatedData) return;

    try {
      const recipeData = {
        title: recipe.estimatedData.title || recipe.title,
        description: recipe.estimatedData.description || 'Receta importada desde documento DOCX',
        ingredients: recipe.estimatedData.ingredients?.map((ing, index) => ({
          name: ing,
          amount: 'al gusto',
          unit: '',
          order: index + 1
        })) || [],
        instructions: recipe.estimatedData.instructions?.map((inst, index) => ({
          step: index + 1,
          description: inst,
          time: undefined,
          temperature: undefined,
          speed: undefined
        })) || [],
        prepTime: recipe.estimatedData.prepTime || 30,
        cookTime: recipe.estimatedData.cookTime,
        servings: recipe.estimatedData.servings || 4,
        difficulty: 'Medio' as const,
        recipeType: 'General',
        tags: [],
        images: []
      };

      const savedRecipe = await api.recipes.create(recipeData);

      setState(prev => ({
        ...prev,
        savedRecipes: [...prev.savedRecipes, recipe.id]
      }));

      if (onRecipeSaved) {
        onRecipeSaved(savedRecipe.id);
      }

      console.log('✅ Recipe saved successfully:', savedRecipe.id);
    } catch (error: any) {
      console.error('❌ Save error:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to save recipe'
      }));
    }
  };

  const handleNextRecipe = () => {
    if (state.extractedRecipes && state.currentRecipeIndex < state.extractedRecipes.length - 1) {
      setState(prev => ({
        ...prev,
        currentRecipeIndex: prev.currentRecipeIndex + 1
      }));
    }
  };

  const handlePreviousRecipe = () => {
    if (state.currentRecipeIndex > 0) {
      setState(prev => ({
        ...prev,
        currentRecipeIndex: prev.currentRecipeIndex - 1
      }));
    }
  };

  const handleSkipRecipe = () => {
    handleNextRecipe();
  };

  const handleFinish = () => {
    // Show summary or close
    handleClose();
  };

  // Calculate progress
  const getProgress = () => {
    switch (state.currentStep) {
      case 'upload': return 25;
      case 'select-pages': return 50;
      case 'extract': return 75;
      case 'review': return 100;
      default: return 0;
    }
  };

  const currentRecipe = state.extractedRecipes?.[state.currentRecipeIndex];
  const totalRecipes = state.extractedRecipes?.length || 0;
  const isLastRecipe = state.currentRecipeIndex === totalRecipes - 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <DialogTitle>
              Importar Recetas desde DOCX
              {state.currentStep === 'review' && totalRecipes > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({state.currentRecipeIndex + 1} de {totalRecipes})
                </span>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progreso</span>
            <span>{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Error Display */}
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {state.currentStep === 'upload' && (
            <FileUploader
              onFileSelect={handleFileUpload}
              loading={state.loading}
            />
          )}

          {state.currentStep === 'select-pages' && state.uploadData && (
            <PageSelector
              uploadData={state.uploadData}
              onPageSelect={handlePageSelection}
              loading={state.loading}
            />
          )}

          {state.currentStep === 'extract' && (
            <RecipeExtractor
              uploadData={state.uploadData!}
              selectedPages={state.selectedPages!}
              onExtract={handleExtractRecipes}
              loading={state.loading}
            />
          )}

          {state.currentStep === 'review' && currentRecipe && (
            <RecipeReviewer
              recipe={currentRecipe}
              recipeIndex={state.currentRecipeIndex}
              totalRecipes={totalRecipes}
              isSaved={state.savedRecipes.includes(currentRecipe.id)}
              onSave={() => handleRecipeSave(currentRecipe)}
              onSkip={handleSkipRecipe}
              loading={state.loading}
            />
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex space-x-2">
            {state.currentStep === 'review' && totalRecipes > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousRecipe}
                  disabled={state.currentRecipeIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextRecipe}
                  disabled={isLastRecipe}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={state.loading}
            >
              {state.currentStep === 'review' && state.savedRecipes.length > 0 ? 'Finalizar' : 'Cancelar'}
            </Button>

            {state.currentStep === 'review' && isLastRecipe && state.savedRecipes.length > 0 && (
              <Button onClick={handleFinish}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Completar ({state.savedRecipes.length} guardadas)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};