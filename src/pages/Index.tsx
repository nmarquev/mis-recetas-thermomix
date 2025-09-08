import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { RecipeCard, Recipe } from "@/components/RecipeCard";
import { RecipeModal } from "@/components/RecipeModal";
import { FilterPanel, RecipeFilters } from "@/components/FilterPanel";
import { mockRecipes } from "@/data/mockRecipes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPage } from "@/components/auth/AuthPage";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showHero, setShowHero] = useState(true);
  const [filters, setFilters] = useState<RecipeFilters>({
    difficulty: [],
    prepTimeRange: [0, 180],
    servingsRange: [1, 12],
    tags: []
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // If user is not logged in, show auth page
  if (!user) {
    return <AuthPage />;
  }

  // Filter recipes by current user and search term
  const userRecipes = mockRecipes.filter(recipe => recipe.userId === user.id);
  
  // Apply search and filters
  const filteredRecipes = userRecipes.filter(recipe => {
    // Search filter
    const matchesSearch = !searchTerm || 
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

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
      filters.tags.some(tag => recipe.tags.includes(tag));

    return matchesSearch && matchesDifficulty && matchesPrepTime && matchesServings && matchesTags;
  });

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
  };

  const handleAddRecipe = () => {
    toast({
      title: "Nueva receta",
      description: "Función de crear receta próximamente disponible",
    });
  };

  const handleImportRecipe = () => {
    toast({
      title: "Importar receta",
      description: "Función de importar desde URL próximamente disponible",
    });
  };

  const handleGetStarted = () => {
    setShowHero(false);
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
        <Hero onGetStarted={handleGetStarted} />
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FilterPanel 
          recipes={userRecipes}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {searchTerm ? `Resultados para "${searchTerm}"` : 'Mis Recetas'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {filteredRecipes.length} receta{filteredRecipes.length !== 1 ? 's' : ''} encontrada{filteredRecipes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id}
                recipe={recipe}
                onView={handleViewRecipe}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No se encontraron recetas
            </h3>
            <p className="text-muted-foreground">
              Intenta con otros términos de búsqueda o agrega una nueva receta
            </p>
          </div>
        )}
      </main>
      
      <RecipeModal 
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Index;
