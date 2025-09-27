import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { RecipeCard, Recipe } from "@/components/RecipeCard";
import { RecipeModal } from "@/components/RecipeModal";
import { FilterPanel, RecipeFilters } from "@/components/FilterPanel";
import { ImportRecipeModal } from "@/components/ImportRecipeModal";
import { CreateRecipeModal } from "@/components/CreateRecipeModal";
import { EditRecipeModal } from "@/components/EditRecipeModal";
import { DeleteRecipeDialog } from "@/components/DeleteRecipeDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Grid3X3, Grid2X2, Grid, Columns, Filter, ChevronDown, X } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/components/auth/AuthPage";
import { isThermomixRecipe } from "@/utils/recipeUtils";

const Index = () => {
  const { toast } = useToast();
  const { user } = useAuth();

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
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
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
    // Search filter
    const matchesSearch = !searchTerm ||
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.tags || []).some(tag => {
        const tagValue = typeof tag === 'string' ? tag : tag.tag || tag.name || '';
        return tagValue.toLowerCase().includes(searchTerm.toLowerCase());
      });

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
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddRecipe={handleAddRecipe}
        onImportRecipe={handleImportRecipe}
        onRecipeAdded={loadRecipes}
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
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Cargando recetas...
            </h3>
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
