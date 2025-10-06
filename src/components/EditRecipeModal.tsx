import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useNutritionCalculator } from '@/hooks/useNutritionCalculator';
import { api } from '@/services/api';
import { Recipe } from '@/types/recipe';
import { Loader2, Plus, X, Upload, Edit, Calculator } from 'lucide-react';
import { resolveImageUrl } from '@/utils/api';

interface EditRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onRecipeUpdated: (recipe: Recipe) => void;
}

interface RecipeFormData {
  title: string;
  description: string;
  prepTime: number;
  cookTime?: number;
  servings: number;
  difficulty: "Fácil" | "Medio" | "Difícil";
  recipeType: string;
  locution: string;
  tags: string[];
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    section?: string;
  }>;
  instructions: Array<{
    description: string;
    function?: string;
    time?: string;
    temperature?: string;
    speed?: string;
    section?: string;
  }>;
}

export const EditRecipeModal = ({ isOpen, onClose, recipe, onRecipeUpdated }: EditRecipeModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [newTag, setNewTag] = useState('');
  const [existingImages, setExistingImages] = useState(recipe?.images || []);
  const [uploadedImages, setUploadedImages] = useState<Array<{ file: File; preview: string }>>([]);
  const { toast } = useToast();
  const { calculateNutrition, isCalculating } = useNutritionCalculator();

  const { register, handleSubmit, control, formState: { errors }, reset, setValue, watch } = useForm<RecipeFormData>();

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control,
    name: 'ingredients'
  });

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = useFieldArray({
    control,
    name: 'instructions'
  });

  const tags = watch('tags') || [];

  // State for new section inputs
  const [showNewIngredientSection, setShowNewIngredientSection] = useState<{ [key: number]: boolean }>({});
  const [showNewInstructionSection, setShowNewInstructionSection] = useState<{ [key: number]: boolean }>({});

  // Detect unique sections from current form data (memoized)
  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();

    // Get sections from ingredients
    const ingredients = watch('ingredients') || [];
    ingredients.forEach(ing => {
      if (ing.section && ing.section.trim()) {
        sections.add(ing.section.trim());
      }
    });

    // Get sections from instructions
    const instructions = watch('instructions') || [];
    instructions.forEach(inst => {
      if (inst.section && inst.section.trim()) {
        sections.add(inst.section.trim());
      }
    });

    return Array.from(sections).sort();
  }, [watch('ingredients'), watch('instructions')]);

  // Initialize form with recipe data
  useEffect(() => {
    if (recipe && isOpen) {
      setExistingImages(recipe.images || []);
      setUploadedImages([]);

      reset({
        title: recipe.title,
        description: recipe.description || '',
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        recipeType: recipe.recipeType || '',
        locution: recipe.locution || '',
        tags: recipe.tags?.map(tag => typeof tag === 'string' ? tag : tag.tag || tag.name || '') || [],
        calories: recipe.calories || undefined,
        protein: recipe.protein || undefined,
        carbohydrates: recipe.carbohydrates || undefined,
        fat: recipe.fat || undefined,
        fiber: recipe.fiber || undefined,
        sugar: recipe.sugar || undefined,
        sodium: recipe.sodium || undefined,
        ingredients: recipe.ingredients?.map(ing => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit || '',
          section: ing.section || ''
        })) || [{ name: '', amount: '', unit: '', section: '' }],
        instructions: recipe.instructions?.map(inst => ({
          description: inst.description,
          function: inst.thermomixSettings?.function || '',
          time: inst.thermomixSettings?.time || '',
          temperature: inst.thermomixSettings?.temperature || '',
          speed: inst.thermomixSettings?.speed || '',
          section: inst.section || ''
        })) || [{ description: '', function: '', time: '', temperature: '', speed: '', section: '' }]
      });
    }
  }, [recipe, isOpen, reset]);

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
    const totalImages = existingImages.length + uploadedImages.length;

    files.forEach(file => {
      if (totalImages < 3 && file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setUploadedImages(prev => [...prev, { file, preview }]);
      }
    });
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    setUploadedImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCalculateNutrition = async () => {
    const currentIngredients = watch('ingredients');
    const currentServings = watch('servings');

    if (!currentIngredients?.length || !currentServings) {
      toast({
        title: "Datos incompletos",
        description: "Agregue ingredientes y porciones antes de calcular",
        variant: "destructive"
      });
      return;
    }

    const result = await calculateNutrition(currentIngredients, currentServings);

    if (result) {
      // Update form with calculated nutrition values
      setValue('calories', result.calories);
      setValue('protein', result.protein);
      setValue('carbohydrates', result.carbohydrates);
      setValue('fat', result.fat);
      setValue('fiber', result.fiber);
      setValue('sugar', result.sugar);
      setValue('sodium', result.sodium);
    }
  };

  const onSubmit = async (data: RecipeFormData) => {
    if (!recipe) return;

    setIsLoading(true);

    try {
      // Upload new images if any
      let newProcessedImages = [];
      if (uploadedImages.length > 0) {
        const files = uploadedImages.map(img => img.file);
        const uploadResult = await api.upload.images(files);
        if (uploadResult.success) {
          newProcessedImages = uploadResult.images;
        }
      }

      // Combine existing and new images
      const allImages = [
        ...existingImages.map((img, index) => ({ ...img, order: index + 1 })),
        ...newProcessedImages.map((img, index) => ({ ...img, order: existingImages.length + index + 1 }))
      ];

      // Create recipe data structure
      const recipeData = {
        title: data.title,
        description: data.description,
        images: allImages,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        difficulty: data.difficulty,
        recipeType: data.recipeType,
        locution: data.locution,
        tags: data.tags,
        calories: data.calories,
        protein: data.protein,
        carbohydrates: data.carbohydrates,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,
        ingredients: data.ingredients.map((ing, index) => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          section: ing.section || undefined,
          order: index + 1
        })),
        instructions: data.instructions.map((inst, index) => ({
          step: index + 1,
          description: inst.description,
          function: inst.function || "",
          time: inst.time || "",
          temperature: inst.temperature || "",
          speed: inst.speed || "",
          section: inst.section || undefined
        }))
      };

      // Check if this is an existing recipe (has ID) or a new/imported recipe
      if (recipe.id) {
        // Existing recipe - update via API
        const updatedRecipe = await api.recipes.update(recipe.id, recipeData as any);

        console.log('✅ Recipe updated successfully, calling onRecipeUpdated');
        onRecipeUpdated(updatedRecipe);

        console.log('🚪 Closing edit modal');
        handleClose();

        console.log('🎉 Showing edit success toast');
        toast({
          title: "¡Receta actualizada!",
          description: `"${data.title}" se ha actualizado exitosamente`,
        });
      } else {
        // New/imported recipe - just update local state
        console.log('📝 Updating local recipe data (no ID yet)');
        onRecipeUpdated(recipeData as any);
        handleClose();
      }
    } catch (error) {
      console.error('Update recipe error:', error);
      toast({
        title: "Error al actualizar receta",
        description: error instanceof Error ? error.message : "No se pudo actualizar la receta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('Closing modal...');

    // Simply close the modal - let the parent handle cleanup
    onClose();
  };

  if (!recipe) return null;

  const totalImages = existingImages.length + uploadedImages.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Receta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Fixed Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 pt-4 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
                <TabsTrigger value="instructions">Instrucciones</TabsTrigger>
                <TabsTrigger value="locution">Locución</TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable content area with fixed height */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
              <TabsContent value="info" className="space-y-6 mt-4 bg-muted/20 p-6 rounded-lg m-0">
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
                  <Select onValueChange={(value) => setValue('difficulty', value as any)} defaultValue={recipe.difficulty}>
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

              {/* Nutrition Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">Información Nutricional</Label>
                  <Button
                    type="button"
                    onClick={handleCalculateNutrition}
                    disabled={isCalculating}
                    variant="outline"
                    size="sm"
                  >
                    {isCalculating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Calculando...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calcular Nutrientes
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="calories">Calorías</Label>
                    <Input
                      id="calories"
                      type="number"
                      step="0.1"
                      {...register('calories')}
                      placeholder="kcal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="protein">Proteína</Label>
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      {...register('protein')}
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbohydrates">Carbohidratos</Label>
                    <Input
                      id="carbohydrates"
                      type="number"
                      step="0.1"
                      {...register('carbohydrates')}
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fat">Grasa</Label>
                    <Input
                      id="fat"
                      type="number"
                      step="0.1"
                      {...register('fat')}
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fiber">Fibra</Label>
                    <Input
                      id="fiber"
                      type="number"
                      step="0.1"
                      {...register('fiber')}
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sugar">Azúcar</Label>
                    <Input
                      id="sugar"
                      type="number"
                      step="0.1"
                      {...register('sugar')}
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sodium">Sodio</Label>
                    <Input
                      id="sodium"
                      type="number"
                      step="0.1"
                      {...register('sodium')}
                      placeholder="mg"
                    />
                  </div>
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

              {/* Images */}
              <div>
                <Label>Imágenes (máximo 3)</Label>

                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Imágenes actuales:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {existingImages.map((img, index) => (
                        <div key={index} className="relative">
                          <img
                            src={resolveImageUrl(img.url)}
                            alt={img.altText || `Imagen ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                            loading="lazy"
                            crossOrigin="anonymous"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload new images */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={totalImages >= 3}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${
                      totalImages >= 3 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {totalImages >= 3 ? 'Máximo 3 imágenes' : 'Haz clic para subir imágenes adicionales'}
                    </span>
                  </label>
                </div>

                {/* New uploaded images */}
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
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground px-1 rounded text-xs">
                          Nueva
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

              <TabsContent value="ingredients" className="space-y-6 mt-4 bg-muted/20 p-6 rounded-lg m-0">
              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Ingredientes *</Label>
                  <Button
                    type="button"
                    onClick={() => appendIngredient({ name: '', amount: '', unit: '', section: '' })}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {ingredientFields.map((field, index) => (
                    <div key={field.id} className="space-y-2 border rounded-lg p-3">
                      <div className="flex gap-2 items-end">
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
                      <div className="w-full space-y-2">
                        <Label className="text-xs">Sección (opcional)</Label>
                        {!showNewIngredientSection[index] ? (
                          <Select
                            value={watch(`ingredients.${index}.section`) || '__none__'}
                            onValueChange={(value) => {
                              if (value === '__new__') {
                                setShowNewIngredientSection(prev => ({ ...prev, [index]: true }));
                                setValue(`ingredients.${index}.section`, '');
                              } else if (value === '__none__') {
                                setValue(`ingredients.${index}.section`, '');
                              } else {
                                setValue(`ingredients.${index}.section`, value);
                              }
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Sin sección" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sin sección</SelectItem>
                              {uniqueSections.map(section => (
                                <SelectItem key={section} value={section}>{section}</SelectItem>
                              ))}
                              <SelectItem value="__new__">+ Nueva sección</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              {...register(`ingredients.${index}.section`)}
                              placeholder="Nombre de la nueva sección"
                              className="text-sm"
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setShowNewIngredientSection(prev => ({ ...prev, [index]: false }))}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

              <TabsContent value="instructions" className="space-y-6 mt-4 bg-muted/20 p-6 rounded-lg m-0">
              {/* Instructions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Instrucciones *</Label>
                  <Button
                    type="button"
                    onClick={() => appendInstruction({ description: '', function: '', time: '', temperature: '', speed: '', section: '' })}
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
                      <div className="mb-2">
                        <Label className="text-xs">Sección (opcional)</Label>
                        {!showNewInstructionSection[index] ? (
                          <Select
                            value={watch(`instructions.${index}.section`) || '__none__'}
                            onValueChange={(value) => {
                              if (value === '__new__') {
                                setShowNewInstructionSection(prev => ({ ...prev, [index]: true }));
                                setValue(`instructions.${index}.section`, '');
                              } else if (value === '__none__') {
                                setValue(`instructions.${index}.section`, '');
                              } else {
                                setValue(`instructions.${index}.section`, value);
                              }
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Sin sección" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sin sección</SelectItem>
                              {uniqueSections.map(section => (
                                <SelectItem key={section} value={section}>{section}</SelectItem>
                              ))}
                              <SelectItem value="__new__">+ Nueva sección</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex gap-2 mb-2">
                            <Input
                              {...register(`instructions.${index}.section`)}
                              placeholder="Nombre de la nueva sección"
                              className="text-sm"
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setShowNewInstructionSection(prev => ({ ...prev, [index]: false }))}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <Label className="text-xs">Función Thermomix</Label>
                          <Input
                            {...register(`instructions.${index}.function`)}
                            placeholder="ej: Amasar, Batir, Picar"
                            size="sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tiempo</Label>
                          <Input
                            {...register(`instructions.${index}.time`)}
                            placeholder="ej: 5 min"
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
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
            </TabsContent>

              <TabsContent value="locution" className="space-y-6 mt-4 bg-muted/20 p-6 rounded-lg m-0">
              {/* Locution */}
              <div>
                <Label htmlFor="locution">Locución (Script para TTS)</Label>
                <Textarea
                  id="locution"
                  {...register('locution')}
                  placeholder="Script de chef explicando la receta para reproducir con voz..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Texto que se reproducirá cuando se use la función de voz. Si está vacío, se generará automáticamente.
                </p>
              </div>
            </TabsContent>
            </div>
            {/* End of scrollable content */}
          </Tabs>

          {/* Fixed Submit Buttons */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Receta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};