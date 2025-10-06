import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { RecipeCard, Recipe } from "@/components/RecipeCard";
import { RecipeModal } from "@/components/RecipeModal";
import { NutritionModal } from "@/components/NutritionModal";
import { FilterPanel, RecipeFilters } from "@/components/FilterPanel";
import { ImportRecipeModal } from "@/components/ImportRecipeModal";
import { CreateRecipeModal } from "@/components/CreateRecipeModal";
import { EditRecipeModal } from "@/components/EditRecipeModal";
import { DeleteRecipeDialog } from "@/components/DeleteRecipeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid3X3, Grid2X2, Grid, Columns, Filter, ChevronDown, X, Play, Pause, Search } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DebugAuth } from "@/components/DebugAuth";
import { AuthPage } from "@/components/auth/AuthPage";
import { isThermomixRecipe } from "@/utils/recipeUtils";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";

const Index = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { applySettingsToUtterance } = useVoiceSettings();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showHero, setShowHero] = useState(() => {
    // Check if hero has been dismissed before
    const heroDismissed = localStorage.getItem('hero-dismissed');
    return heroDismissed !== 'true';
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [nutritionRecipe, setNutritionRecipe] = useState<Recipe | null>(null);

  // TTS states
  const [playingRecipeId, setPlayingRecipeId] = useState<string | null>(null);
  const [generatingScript, setGeneratingScript] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [filters, setFilters] = useState<RecipeFilters>({
    difficulty: [],
    prepTimeRange: [0, 180],
    recipeTypes: [],
    tags: [],
    featured: undefined,
    thermomixOnly: undefined
  });
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3); // Default to 3 columns
  const [showFilters, setShowFilters] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(24); // Start with 24 items
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Apply search and filters, then sort alphabetically (only when user is logged in)
  const allFilteredRecipes = user ? recipes.filter(recipe => {
    // Search filter - busca en título, descripción, ingredientes, instrucciones y etiquetas
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      recipe.title.toLowerCase().includes(searchLower) ||
      recipe.description.toLowerCase().includes(searchLower) ||
      (recipe.ingredients || []).some(ingredient =>
        ingredient.name.toLowerCase().includes(searchLower) ||
        (ingredient.amount && ingredient.amount.toLowerCase().includes(searchLower)) ||
        (ingredient.unit && ingredient.unit.toLowerCase().includes(searchLower))
      ) ||
      (recipe.instructions || []).some(instruction =>
        instruction.description.toLowerCase().includes(searchLower)
      ) ||
      (recipe.tags || []).some(tag => {
        const tagValue = typeof tag === 'string' ? tag : tag.tag || tag.name || '';
        return tagValue.toLowerCase().includes(searchLower);
      }) ||
      (recipe.recipeType && recipe.recipeType.toLowerCase().includes(searchLower));

    // Difficulty filter
    const matchesDifficulty = filters.difficulty.length === 0 ||
      filters.difficulty.includes(recipe.difficulty);

    // Prep time filter
    const matchesPrepTime = recipe.prepTime >= (filters.prepTimeRange?.[0] ?? 0) &&
      recipe.prepTime <= (filters.prepTimeRange?.[1] ?? 180);


    // Recipe type filter
    const matchesRecipeType = filters.recipeTypes.length === 0 ||
      (recipe.recipeType && filters.recipeTypes.includes(recipe.recipeType));

    // Tags filter
    const matchesTags = filters.tags.length === 0 ||
      filters.tags.some(filterTag =>
        (recipe.tags || []).some(recipeTag => {
          const tagValue = typeof recipeTag === 'string' ? recipeTag : recipeTag.tag || recipeTag.name || '';
          return tagValue === filterTag;
        })
      );

    // Featured filter
    const matchesFeatured = !filters.featured || recipe.featured === true;

    // Thermomix filter
    const matchesThermomix = !filters.thermomixOnly || isThermomixRecipe(recipe);

    return matchesSearch && matchesDifficulty && matchesPrepTime && matchesRecipeType && matchesTags && matchesFeatured && matchesThermomix;
  }).sort((a, b) => {
    // Sort alphabetically by title
    return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
  }) : [];

  // Get displayed recipes (for pagination)
  const filteredRecipes = allFilteredRecipes.slice(0, displayedCount);

  // Load recipes function (extracted for reuse)
  const loadRecipes = async () => {
    if (!user) return;

    try {
      setIsLoadingRecipes(true);
      const userRecipes = await api.recipes.getAll();
      setRecipes(userRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast({
        title: "Error al cargar recetas",
        description: "No se pudieron cargar las recetas",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  // Load recipes when user is available
  useEffect(() => {
    loadRecipes();
  }, [user, toast]);

  // Scroll infinite loading effect
  useEffect(() => {
    if (!user) return; // Skip if not logged in

    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 && // Load more when 1000px from bottom
        !isLoadingMore &&
        displayedCount < allFilteredRecipes.length
      ) {
        setIsLoadingMore(true);

        // Simulate loading delay
        setTimeout(() => {
          setDisplayedCount(prev => Math.min(prev + 24, allFilteredRecipes.length));
          setIsLoadingMore(false);
        }, 500);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, allFilteredRecipes.length, displayedCount, isLoadingMore]);

  // Reset displayed count when filters change
  useEffect(() => {
    if (!user) return; // Skip if not logged in
    setDisplayedCount(24);
  }, [user, searchTerm, filters]);

  // If user is not logged in, show auth page
  if (!user) {
    return <AuthPage />;
  }

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleCloseModal = () => {
    // Cleanup TTS states when closing modal
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingRecipeId(null);
    setGeneratingScript(null);
    setSelectedRecipe(null);
  };

  const handleAddRecipe = () => {
    setShowCreateModal(true);
  };

  const handleImportRecipe = () => {
    setShowImportModal(true);
  };

  const handleImportSuccess = (recipe: Recipe) => {
    // Add the imported recipe to the local state
    setRecipes(prev => [recipe, ...prev]);
    // Hide hero to show the recipes list
    setShowHero(false);
    // Clear any active filters to show all recipes including the new one
    setFilters(prev => ({
      difficulty: prev.difficulty || [],
      prepTimeRange: prev.prepTimeRange || [0, 180],
      recipeTypes: prev.recipeTypes || [],
      tags: prev.tags || [],
      featured: undefined,
      thermomixOnly: prev.thermomixOnly
    }));
    toast({
      title: "¡Receta importada exitosamente!",
      description: `"${recipe.title}" ha sido añadida a tu colección`,
    });
  };

  const handleRecipeCreated = (recipe: Recipe) => {
    console.log('🎯 handleRecipeCreated called with recipe:', recipe.title);
    // Add the new recipe to the local state
    setRecipes(prev => {
      console.log('📋 Adding new recipe to recipes list');
      return [recipe, ...prev];
    });
    // Hide hero to show the recipes list
    console.log('👋 Hiding hero to show recipes list');
    setShowHero(false);
    // Clear any active filters to show all recipes including the new one
    console.log('🔧 Clearing featured filter');
    setFilters(prev => ({
      difficulty: prev.difficulty || [],
      prepTimeRange: prev.prepTimeRange || [0, 180],
      recipeTypes: prev.recipeTypes || [],
      tags: prev.tags || [],
      featured: undefined,
      thermomixOnly: prev.thermomixOnly
    }));
    console.log('🎊 Showing recipe created toast');
    toast({
      title: "¡Receta creada exitosamente!",
      description: `"${recipe.title}" ha sido guardada en tu colección`,
    });
    console.log('✅ handleRecipeCreated completed');
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setRecipeToEdit(recipe);
    setShowEditModal(true);
  };

  const handleRecipeUpdated = (updatedRecipe: Recipe) => {
    console.log('🔄 handleRecipeUpdated called with recipe:', updatedRecipe.title);
    // Update the recipe in the local state
    setRecipes(prev => {
      console.log('📝 Updating recipe in recipes list');
      return prev.map(recipe =>
        recipe.id === updatedRecipe.id ? updatedRecipe : recipe
      );
    });
    console.log('🎊 Showing recipe updated toast');
    toast({
      title: "¡Receta actualizada!",
      description: `"${updatedRecipe.title}" se ha actualizado exitosamente`,
    });
    console.log('✅ handleRecipeUpdated completed');
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setShowDeleteDialog(true);
  };

  const handleShowNutrition = (recipe: Recipe) => {
    setNutritionRecipe(recipe);
    setShowNutritionModal(true);
  };

  const handleNutritionUpdate = (updatedRecipe: Recipe) => {
    // Update the recipe in the main recipes list
    setRecipes(prev => prev.map(recipe =>
      recipe.id === updatedRecipe.id ? updatedRecipe : recipe
    ));

    // Update the nutrition recipe state to reflect changes
    setNutritionRecipe(updatedRecipe);
  };

  const handleRecipeDeleted = (recipeId: string) => {
    // Remove the recipe from the local state
    setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
  };

  const handleToggleFavorite = async (recipe: Recipe) => {
    console.log('🔄 Starting handleToggleFavorite for recipe:', recipe.title, 'Current featured:', recipe.featured);

    try {
      // Optimistically update UI first
      const newFeaturedState = !recipe.featured;
      console.log('✨ Optimistically updating UI, newFeaturedState:', newFeaturedState);

      setRecipes(prev => {
        const updated = prev.map(r =>
          r.id === recipe.id ? { ...r, featured: newFeaturedState } : r
        );
        console.log('📊 Recipe state updated optimistically');
        return updated;
      });

      // Clean instructions to handle null values
      const cleanedInstructions = recipe.instructions.map(instruction => ({
        ...instruction,
        time: instruction.time || "",
        temperature: instruction.temperature || "",
        speed: instruction.speed || ""
      }));
      console.log('🧹 Instructions cleaned:', cleanedInstructions.length, 'instructions');

      // Clean tags to handle both string and object formats
      const cleanedTags = recipe.tags.map(tag => {
        if (typeof tag === 'string') {
          return { tag, tagId: tag }; // Convert string to object format
        }
        return tag; // Already an object
      });

      console.log('🚀 Calling API to update recipe...');
      const updatedRecipe = await api.recipes.update(recipe.id, {
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        images: recipe.images,
        ingredients: recipe.ingredients,
        instructions: cleanedInstructions,
        tags: cleanedTags,
        sourceUrl: recipe.sourceUrl,
        recipeType: recipe.recipeType,
        featured: newFeaturedState
      });

      console.log('✅ API call successful! Updated recipe featured state:', updatedRecipe.featured);

      // Update with the server response (in case of discrepancies)
      setRecipes(prev => {
        const final = prev.map(r =>
          r.id === recipe.id ? updatedRecipe : r
        );
        console.log('🔄 Final state update with server response');
        return final;
      });

      console.log('🎉 Showing success toast');
      toast({
        title: updatedRecipe.featured ? "¡Añadida a favoritos!" : "Eliminada de favoritos",
        description: `"${updatedRecipe.title}" ${updatedRecipe.featured ? 'se añadió a' : 'se eliminó de'} tus favoritos`,
      });

      console.log('✅ handleToggleFavorite completed successfully');
    } catch (error) {
      console.error('❌ Error in handleToggleFavorite:', error);

      // Revert optimistic update on error
      console.log('🔙 Reverting optimistic update due to error');
      setRecipes(prev => prev.map(r =>
        r.id === recipe.id ? recipe : r
      ));

      console.log('🚨 Showing error toast');
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de favorito",
        variant: "destructive"
      });
    }
  };

  const handleGetStarted = () => {
    setShowHero(false);
    localStorage.setItem('hero-dismissed', 'true');
  };

  const handleViewFeatured = () => {
    setShowHero(false);
    localStorage.setItem('hero-dismissed', 'true');
    // Filter to show only featured recipes
    setFilters(prev => ({
      difficulty: prev.difficulty || [],
      prepTimeRange: prev.prepTimeRange || [0, 180],
      recipeTypes: prev.recipeTypes || [],
      tags: prev.tags || [],
      featured: true,
      thermomixOnly: prev.thermomixOnly
    }));
  };

  const handleFiltersChange = (newFilters: RecipeFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      difficulty: [],
      prepTimeRange: [0, 180],
      recipeTypes: [],
      tags: [],
      featured: undefined,
      thermomixOnly: undefined
    });
  };

  const handlePlayTTS = async (recipe: Recipe) => {
    try {
      // If already playing this recipe, pause it
      if (playingRecipeId === recipe.id) {
        window.speechSynthesis.cancel();
        setPlayingRecipeId(null);
        toast({
          title: "🔇 Audio pausado",
          description: `"${recipe.title}"`,
        });
        return;
      }

      // If playing another recipe, stop it first
      if (playingRecipeId) {
        window.speechSynthesis.cancel();
        setPlayingRecipeId(null);
        // Small delay to ensure cancel is processed
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!('speechSynthesis' in window)) {
        toast({
          title: "No compatible",
          description: "TTS no es soportado en este navegador",
          variant: "destructive",
        });
        return;
      }

      let scriptText = recipe.locution;

      // Generate script if it doesn't exist
      if (!scriptText?.trim()) {
        setGeneratingScript(recipe.id);

        // Group ingredients and instructions by section
        const ingredientsBySection = new Map<string | null, typeof recipe.ingredients>();
        recipe.ingredients.forEach(ing => {
          const section = ing.section || null;
          if (!ingredientsBySection.has(section)) {
            ingredientsBySection.set(section, []);
          }
          ingredientsBySection.get(section)!.push(ing);
        });

        const instructionsBySection = new Map<string | null, typeof recipe.instructions>();
        recipe.instructions.forEach(inst => {
          const section = inst.section || null;
          if (!instructionsBySection.has(section)) {
            instructionsBySection.set(section, []);
          }
          instructionsBySection.get(section)!.push(inst);
        });

        // Format ingredients with sections
        let ingredientsText = '';
        Array.from(ingredientsBySection.entries()).forEach(([section, ingredients]) => {
          if (section) {
            ingredientsText += `\n${section}:\n`;
          }
          ingredients.forEach(ing => {
            ingredientsText += `- ${ing.amount} ${ing.unit || ''} ${ing.name}\n`;
          });
        });

        // Format instructions with sections
        let instructionsText = '';
        let stepCounter = 1;
        Array.from(instructionsBySection.entries()).forEach(([section, instructions]) => {
          if (section) {
            instructionsText += `\n${section}:\n`;
          }
          instructions.forEach(inst => {
            instructionsText += `${stepCounter}. ${inst.description}\n`;
            stepCounter++;
          });
        });

        const prompt = `Genera un script para explicar esta receta de cocina. El script debe ser natural, entusiasta y fácil de seguir. NO te presentes ni menciones tu nombre, simplemente explica la receta directamente. Los datos de la receta son:

Título: ${recipe.title}
Descripción: ${recipe.description || 'Sin descripción'}
Tiempo de preparación: ${recipe.prepTime} minutos
Tiempo de cocción: ${recipe.cookTime || 'No especificado'} minutos
Porciones: ${recipe.servings}
Dificultad: ${recipe.difficulty}

Ingredientes:
${ingredientsText}

Instrucciones:
${instructionsText}

IMPORTANTE: Si hay secciones en los ingredientes o instrucciones (por ejemplo "Para la masa", "Para el relleno"), menciónalas claramente en el script para que el oyente entienda que esta receta tiene múltiples partes. Por ejemplo: "Para la masa necesitaremos..." o "Ahora vamos con el relleno...".

Genera un script natural y conversacional explicando la receta paso a paso. Comienza directamente con la receta sin presentarte. Que sea fluido y agradable de escuchar.`;

        try {
          const response = await api.llm.generateScript(prompt);
          if (response && response.success && response.script) {
            scriptText = response.script;

            // Save the generated script to the recipe
            const updatedRecipe = { ...recipe, locution: scriptText };

            // Clean the recipe data to match backend schema
            const cleanedRecipe = {
              title: updatedRecipe.title,
              description: updatedRecipe.description,
              prepTime: updatedRecipe.prepTime,
              cookTime: updatedRecipe.cookTime,
              servings: updatedRecipe.servings,
              difficulty: updatedRecipe.difficulty,
              recipeType: updatedRecipe.recipeType,
              locution: updatedRecipe.locution,
              images: updatedRecipe.images,
              ingredients: updatedRecipe.ingredients.map(ing => ({
                name: ing.name,
                amount: ing.amount || "",
                unit: ing.unit || "",
                section: ing.section || undefined,
                order: ing.order
              })),
              instructions: updatedRecipe.instructions.map(inst => ({
                step: inst.step,
                description: inst.description,
                time: inst.thermomixSettings?.time || "",
                temperature: inst.thermomixSettings?.temperature || "",
                speed: inst.thermomixSettings?.speed || "",
                section: inst.section || undefined
              })),
              tags: updatedRecipe.tags.map(tag =>
                typeof tag === 'string' ? tag : tag.tag || tag.name || String(tag)
              ).filter(tag => tag && tag.length > 0)
            };

            await api.recipes.update(recipe.id, cleanedRecipe);

            // Update local state
            setRecipes(prev => prev.map(r => r.id === recipe.id ? updatedRecipe : r));
          }
        } catch (error) {
          console.error('Error generating TTS script:', error);
          toast({
            title: "Error",
            description: "No se pudo generar el script automáticamente",
            variant: "destructive",
          });
          return;
        } finally {
          setGeneratingScript(null);
        }
      }

      if (!scriptText?.trim()) {
        toast({
          title: "Sin contenido",
          description: "No hay texto para reproducir",
          variant: "destructive",
        });
        return;
      }

      // Create utterance and apply voice settings
      const utterance = new SpeechSynthesisUtterance(scriptText);

      // Apply voice settings
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'es-AR';

      utterance.onstart = () => {
        setPlayingRecipeId(recipe.id);
        toast({
          title: "🎧 Reproduciendo receta",
          description: `"${recipe.title}"`,
        });
      };

      utterance.onend = () => {
        setPlayingRecipeId(null);
      };

      utterance.onerror = () => {
        setPlayingRecipeId(null);
        toast({
          title: "Error de reproducción",
          description: "No se pudo reproducir el audio",
          variant: "destructive",
        });
      };

      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('Error in TTS playback:', error);
      setPlayingRecipeId(null);
      setGeneratingScript(null);
      toast({
        title: "Error",
        description: "Error al reproducir la receta",
        variant: "destructive",
      });
    }
  };

  // Get grid class based on column count
  const getGridClass = () => {
    switch (gridColumns) {
      case 2:
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 3:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 4:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  const getColumnIcon = (columns: number) => {
    switch (columns) {
      case 2:
        return <Grid2X2 className="h-4 w-4" />;
      case 3:
        return <Grid3X3 className="h-4 w-4" />;
      case 4:
        return <Grid className="h-4 w-4" />;
      default:
        return <Grid3X3 className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onAddRecipe={handleAddRecipe}
        onImportRecipe={handleImportRecipe}
        onRecipeAdded={loadRecipes}
        onViewRecipe={handleViewRecipe}
      />
      
      {showHero && (
        <Hero onGetStarted={handleGetStarted} onViewFeatured={handleViewFeatured} />
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {searchTerm ? `Resultados para "${searchTerm}"` : `Recetas de ${user?.alias || user?.name || 'Usuario'}`}
            </h2>
            <p className="text-muted-foreground mt-1">
              Mostrando {filteredRecipes.length} de {allFilteredRecipes.length} receta{allFilteredRecipes.length !== 1 ? 's' : ''}
              {displayedCount < allFilteredRecipes.length && (
                <span className="text-primary"> • Scroll para ver más</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, ingrediente, etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48 sm:w-64"
              />
            </div>

            {/* Column selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  {getColumnIcon(gridColumns)}
                  <span className="ml-2">{gridColumns} columnas</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setGridColumns(2)}
                  className={gridColumns === 2 ? "bg-accent" : ""}
                >
                  <Grid2X2 className="h-4 w-4 mr-2" />
                  2 columnas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGridColumns(3)}
                  className={gridColumns === 3 ? "bg-accent" : ""}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  3 columnas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGridColumns(4)}
                  className={gridColumns === 4 ? "bg-accent" : ""}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  4 columnas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Filter button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Horizontal Filter Panel */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Filtros</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 px-3"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Difficulty Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Dificultad</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Fácil", "Medio", "Difícil"].map((difficulty) => (
                      <Button
                        key={difficulty}
                        variant={filters.difficulty.includes(difficulty) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newDifficulties = filters.difficulty.includes(difficulty)
                            ? filters.difficulty.filter(d => d !== difficulty)
                            : [...filters.difficulty, difficulty];
                          handleFiltersChange({ ...filters, difficulty: newDifficulties });
                        }}
                        className="h-8"
                      >
                        {difficulty}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Recipe Type Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Tipo de Receta</Label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(
                      recipes.map(recipe => recipe.recipeType).filter(type => type && type.length > 0)
                    )).sort().map((recipeType) => (
                      <Button
                        key={recipeType}
                        variant={filters.recipeTypes.includes(recipeType!) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newTypes = filters.recipeTypes.includes(recipeType!)
                            ? filters.recipeTypes.filter(t => t !== recipeType)
                            : [...filters.recipeTypes, recipeType!];
                          handleFiltersChange({ ...filters, recipeTypes: newTypes });
                        }}
                        className="h-7 text-xs"
                      >
                        {recipeType}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Favorites Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Favoritos</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={filters.featured === true ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        handleFiltersChange({
                          ...filters,
                          featured: filters.featured === true ? undefined : true
                        });
                      }}
                      className="h-8"
                    >
                      ⭐ Solo Favoritos
                    </Button>
                  </div>
                </div>

                {/* Tags Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Etiquetas</Label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {Array.from(new Set(
                      recipes.flatMap(recipe =>
                        recipe.tags.map(tag => typeof tag === 'string' ? tag : tag.tag || tag.name || '')
                      ).filter(tag => tag.length > 0)
                    )).sort().slice(0, 10).map((tag) => (
                      <Button
                        key={tag}
                        variant={filters.tags.includes(tag) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newTags = filters.tags.includes(tag)
                            ? filters.tags.filter(t => t !== tag)
                            : [...filters.tags, tag];
                          handleFiltersChange({ ...filters, tags: newTags });
                        }}
                        className="h-7 text-xs"
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {isLoadingRecipes ? (
          <div className={getGridClass()}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="group overflow-hidden bg-gradient-card shadow-recipe-card rounded-lg">
                {/* Image skeleton */}
                <Skeleton className="w-full h-48 rounded-t-lg" />

                {/* Content skeleton */}
                <div className="p-4 space-y-3">
                  {/* Title skeleton */}
                  <Skeleton className="h-6 w-3/4" />

                  {/* Description skeleton */}
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />

                  {/* Meta info skeleton */}
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>

                  {/* Recipe type skeleton */}
                  <Skeleton className="h-6 w-20" />

                  {/* Tags skeleton */}
                  <div className="flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                  </div>

                  {/* Buttons skeleton */}
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <>
            <div className={getGridClass()}>
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  columns={gridColumns}
                  onView={handleViewRecipe}
                  onEdit={handleEditRecipe}
                  onDelete={handleDeleteRecipe}
                  onToggleFavorite={handleToggleFavorite}
                  onPlayTTS={handlePlayTTS}
                  onShowNutrition={handleShowNutrition}
                  isPlayingTTS={playingRecipeId === recipe.id}
                  isGeneratingScript={generatingScript === recipe.id}
                />
              ))}
            </div>

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-muted-foreground">Cargando más recetas...</p>
              </div>
            )}

            {/* End of results indicator */}
            {displayedCount >= allFilteredRecipes.length && allFilteredRecipes.length > 24 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">¡Has visto todas las recetas! 🎉</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {recipes.length === 0 ? 'No tienes recetas aún' : 'No se encontraron recetas'}
            </h3>
            <p className="text-muted-foreground">
              {recipes.length === 0
                ? 'Comienza creando tu primera receta o importando desde una URL'
                : 'Intenta con otros términos de búsqueda o agrega una nueva receta'
              }
            </p>
          </div>
        )}
      </main>
      
      <RecipeModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={handleCloseModal}
      />

      <ImportRecipeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
        onViewRecipe={handleViewRecipe}
      />

      <CreateRecipeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRecipeCreated={handleRecipeCreated}
      />

      <EditRecipeModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        recipe={recipeToEdit}
        onRecipeUpdated={handleRecipeUpdated}
      />

      <DeleteRecipeDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        recipe={recipeToDelete}
        onRecipeDeleted={handleRecipeDeleted}
      />

      <NutritionModal
        recipe={nutritionRecipe}
        isOpen={showNutritionModal}
        onClose={() => setShowNutritionModal(false)}
        onRecipeUpdate={handleNutritionUpdate}
      />

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border/50 py-4 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            © Copyright 2025 - TasteBox
          </p>
        </div>
      </footer>

    </div>
  );
};

export default Index;
