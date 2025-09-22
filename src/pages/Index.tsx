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
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/components/auth/AuthPage";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showHero, setShowHero] = useState(true);
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
    servingsRange: [1, 12],
    tags: []
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Load recipes when user is available
  useEffect(() => {
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

    loadRecipes();
  }, [user, toast]);

  // If user is not logged in, show auth page
  if (!user) {
    return <AuthPage />;
  }
  
  // Apply search and filters
  const filteredRecipes = recipes.filter(recipe => {
    // Search filter
    const matchesSearch = !searchTerm || 
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.tags.some(tag => {
        const tagValue = typeof tag === 'string' ? tag : tag.tag || tag.name || '';
        return tagValue.toLowerCase().includes(searchTerm.toLowerCase());
      });

    // Difficulty filter
    const matchesDifficulty = filters.difficulty.length === 0 || 
      filters.difficulty.includes(recipe.difficulty);

    // Prep time filter
    const matchesPrepTime = recipe.prepTime >= filters.prepTimeRange[0] && 
      recipe.prepTime <= filters.prepTimeRange[1];

    // Servings filter
    const matchesServings = recipe.servings >= filters.servingsRange[0] && 
      recipe.servings <= filters.servingsRange[1];

    // Tags filter
    const matchesTags = filters.tags.length === 0 ||
      filters.tags.some(filterTag =>
        recipe.tags.some(recipeTag => {
          const tagValue = typeof recipeTag === 'string' ? recipeTag : recipeTag.tag || recipeTag.name || '';
          return tagValue === filterTag;
        })
      );

    // Featured filter
    const matchesFeatured = !filters.featured || recipe.featured === true;

    return matchesSearch && matchesDifficulty && matchesPrepTime && matchesServings && matchesTags && matchesFeatured;
  });

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
      ...prev,
      featured: undefined
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
      ...prev,
      featured: undefined
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
        tags: recipe.tags,
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
  };

  const handleViewFeatured = () => {
    setShowHero(false);
    // Filter to show only featured recipes
    setFilters(prev => ({
      ...prev,
      featured: true
    }));
  };

  const handleFiltersChange = (newFilters: RecipeFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      difficulty: [],
      prepTimeRange: [0, 180],
      servingsRange: [1, 12],
      tags: []
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddRecipe={handleAddRecipe}
        onImportRecipe={handleImportRecipe}
      />
      
      {showHero && (
        <Hero onGetStarted={handleGetStarted} onViewFeatured={handleViewFeatured} />
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {searchTerm ? `Resultados para "${searchTerm}"` : 'Mis Recetas'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {filteredRecipes.length} receta{filteredRecipes.length !== 1 ? 's' : ''} encontrada{filteredRecipes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="w-80">
            <FilterPanel
              recipes={recipes}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
        
        {isLoadingRecipes ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Cargando recetas...
            </h3>
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onView={handleViewRecipe}
                onEdit={handleEditRecipe}
                onDelete={handleDeleteRecipe}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
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
    </div>
  );
};

export default Index;
