import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Recipe } from '@/types/recipe';
import { Loader2, Plus, X, Upload, ChefHat } from 'lucide-react';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: Recipe) => void;
}

interface RecipeFormData {
  title: string;
  description: string;
  prepTime: number;
  cookTime?: number;
  servings: number;
  difficulty: "Fácil" | "Medio" | "Difícil";
  recipeType: string;
  tags: string[];
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  instructions: Array<{
    description: string;
    time?: string;
    temperature?: string;
    speed?: string;
  }>;
}

export const CreateRecipeModal = ({ isOpen, onClose, onRecipeCreated }: CreateRecipeModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [uploadedImages, setUploadedImages] = useState<Array<{ file: File; preview: string }>>([]);
  const { toast } = useToast();

  const { register, handleSubmit, control, formState: { errors }, reset, setValue, watch } = useForm<RecipeFormData>({
    defaultValues: {
      title: '',
      description: '',
      prepTime: 30,
      servings: 4,
      difficulty: 'Fácil',
      recipeType: '',
      tags: [],
      ingredients: [{ name: '', amount: '', unit: '' }],
      instructions: [{ description: '', time: '', temperature: '', speed: '' }]
    }
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control,
    name: 'ingredients'
  });

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = useFieldArray({
    control,
    name: 'instructions'
  });

  const tags = watch('tags');

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setValue('tags', [...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    files.forEach(file => {
      if (uploadedImages.length < 3 && file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setUploadedImages(prev => [...prev, { file, preview }]);
      }
    });
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (data: RecipeFormData) => {
    setIsLoading(true);

    try {
      // Upload images first if any
      let processedImages = [];
      if (uploadedImages.length > 0) {
        const files = uploadedImages.map(img => img.file);
        const uploadResult = await api.upload.images(files);
        if (uploadResult.success) {
          processedImages = uploadResult.images;
        }
      }

      // Create recipe data structure
      const recipeData = {
        title: data.title,
        description: data.description,
        images: processedImages,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        difficulty: data.difficulty,
        recipeType: data.recipeType,
        tags: data.tags,
        ingredients: data.ingredients.map((ing, index) => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          order: index + 1
        })),
        instructions: data.instructions.map((inst, index) => ({
          step: index + 1,
          description: inst.description,
          thermomixSettings: {
            time: inst.time || "",
            temperature: inst.temperature || "",
            speed: inst.speed || ""
          }
        }))
      };

      const createdRecipe = await api.recipes.create(recipeData as any);

      console.log('✅ Recipe created successfully, calling onRecipeCreated');
      onRecipeCreated(createdRecipe);

      console.log('🚪 Closing create modal');
      handleClose();

      console.log('🎉 Showing create success toast');
      toast({
        title: "¡Receta creada!",
        description: `"${data.title}" se ha guardado exitosamente`,
      });
    } catch (error) {
      console.error('Create recipe error:', error);
      toast({
        title: "Error al crear receta",
        description: error instanceof Error ? error.message : "No se pudo crear la receta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Clean up object URLs to prevent memory leaks
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    reset();
    setUploadedImages([]);
    setNewTag('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Crear Nueva Receta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                {...register('title', { required: 'El título es requerido' })}
                placeholder="Nombre de tu receta"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe tu receta..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="prepTime">Tiempo de Preparación (min) *</Label>
              <Input
                id="prepTime"
                type="number"
                {...register('prepTime', { required: true, min: 1 })}
              />
            </div>

            <div>
              <Label htmlFor="cookTime">Tiempo de Cocción (min)</Label>
              <Input
                id="cookTime"
                type="number"
                {...register('cookTime', { min: 0 })}
              />
            </div>

            <div>
              <Label htmlFor="servings">Porciones *</Label>
              <Input
                id="servings"
                type="number"
                {...register('servings', { required: true, min: 1 })}
              />
            </div>

            <div>
              <Label>Dificultad *</Label>
              <Select onValueChange={(value) => setValue('difficulty', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar dificultad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Medio">Medio</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recipeType">Tipo de Receta</Label>
              <Input
                id="recipeType"
                {...register('recipeType')}
                placeholder="ej: Pasta, Postre, Sopa"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Etiquetas</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Agregar etiqueta"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" onClick={handleAddTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Imágenes (máximo 3)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={uploadedImages.length >= 3}
              />
              <label
                htmlFor="image-upload"
                className={`cursor-pointer flex flex-col items-center gap-2 ${
                  uploadedImages.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {uploadedImages.length >= 3 ? 'Máximo 3 imágenes' : 'Haz clic para subir imágenes'}
                </span>
              </label>
            </div>

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={img.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ingredientes *</Label>
              <Button
                type="button"
                onClick={() => appendIngredient({ name: '', amount: '', unit: '' })}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {ingredientFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      {...register(`ingredients.${index}.name`, { required: true })}
                      placeholder="Ingrediente"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      {...register(`ingredients.${index}.amount`, { required: true })}
                      placeholder="Cantidad"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      {...register(`ingredients.${index}.unit`)}
                      placeholder="Unidad"
                    />
                  </div>
                  {ingredientFields.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      size="sm"
                      variant="destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Instrucciones *</Label>
              <Button
                type="button"
                onClick={() => appendInstruction({ description: '', time: '', temperature: '', speed: '' })}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Paso
              </Button>
            </div>
            <div className="space-y-4">
              {instructionFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Paso {index + 1}</Label>
                    {instructionFields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        size="sm"
                        variant="destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    {...register(`instructions.${index}.description`, { required: true })}
                    placeholder="Describe el paso..."
                    className="mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Tiempo Thermomix</Label>
                      <Input
                        {...register(`instructions.${index}.time`)}
                        placeholder="ej: 5 min"
                        size="sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Temperatura</Label>
                      <Input
                        {...register(`instructions.${index}.temperature`)}
                        placeholder="ej: 100°"
                        size="sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Velocidad</Label>
                      <Input
                        {...register(`instructions.${index}.speed`)}
                        placeholder="ej: vel 5"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear Receta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};