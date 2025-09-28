import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, Edit, Trash2, MoreVertical, Heart, Share, Printer, Download, Play, Pause, ExternalLink, Calculator } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Recipe } from "@/types/recipe";
import { resolveImageUrl } from "@/utils/api";
import { isThermomixRecipe } from "@/utils/recipeUtils";
import { getSiteName, isValidUrl } from "@/utils/siteUtils";

interface RecipeCardProps {
  recipe: Recipe;
  onView: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  onPlayTTS?: (recipe: Recipe) => void;
  onShowNutrition?: (recipe: Recipe) => void;
  columns?: 2 | 3 | 4;
  isPlayingTTS?: boolean;
  isGeneratingScript?: boolean;
}

export const RecipeCard = ({ recipe, onView, onEdit, onDelete, onToggleFavorite, onPlayTTS, onShowNutrition, columns = 3, isPlayingTTS = false, isGeneratingScript = false }: RecipeCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Fácil": return "bg-secondary text-secondary-foreground";
      case "Medio": return "bg-accent text-accent-foreground";
      case "Difícil": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const primaryImage = recipe.images?.[0];
  const hasMultipleImages = recipe.images && recipe.images.length > 1;
  const hasNutritionData = recipe.calories !== null && recipe.calories !== undefined && recipe.calories > 0;

  // Get dynamic image height based on columns
  const getImageHeight = () => {
    switch (columns) {
      case 2:
        return 'h-64'; // Taller for 2 columns
      case 3:
        return 'h-48'; // Default height for 3 columns
      case 4:
        return 'h-40'; // Shorter for 4 columns
      default:
        return 'h-48';
    }
  };

  return (
    <Card className="group overflow-hidden bg-gradient-card shadow-recipe-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden">
        {primaryImage ? (
          <img
            src={resolveImageUrl(primaryImage.url)}
            alt={primaryImage.altText || recipe.title}
            className={`w-full ${getImageHeight()} object-cover transition-transform duration-300 group-hover:scale-105`}
            loading="lazy"
            crossOrigin="anonymous"
          />
        ) : (
          <div className={`w-full ${getImageHeight()} bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center`}>
            <ChefHat className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          {onToggleFavorite && (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(recipe);
              }}
              className={`h-8 w-8 p-0 ${recipe.featured ? 'bg-red-100/50 hover:bg-red-200/50' : 'bg-white/50 hover:bg-white/70'}`}
            >
              <Heart className={`h-4 w-4 ${recipe.featured ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </Button>
          )}
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0 bg-white/50 hover:bg-white/70"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onShowNutrition && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onShowNutrition(recipe);
                  }}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Ver Nutrición
                  </DropdownMenuItem>
                )}
                {recipe.sourceUrl && isValidUrl(recipe.sourceUrl) && (
                  <DropdownMenuItem onClick={() => window.open(recipe.sourceUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver en {getSiteName(recipe.sourceUrl)}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => {}}>
                  <Share className="h-4 w-4 mr-2" />
                  Compartir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(recipe)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(recipe)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          <Badge className={getDifficultyColor(recipe.difficulty)}>
            {recipe.difficulty}
          </Badge>
        </div>
        {hasMultipleImages && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="secondary" className="text-xs">
              +{recipe.images.length - 1} fotos
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div className="min-h-[5.5rem]">
          <h3 className="font-semibold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors h-14 leading-7">
            {recipe.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mt-1 h-10 leading-5">
            {recipe.description || 'Sin descripción'}
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{recipe.prepTime} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{recipe.servings}</span>
          </div>
          {isThermomixRecipe(recipe) && (
            <div className="flex items-center gap-1">
              <ChefHat className="h-4 w-4" />
              <span>Thermomix</span>
            </div>
          )}
        </div>

        {/* Recipe Type/Category */}
        {recipe.recipeType && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {recipe.recipeType}
            </Badge>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1 min-h-[3.5rem] items-start content-start">
          {(recipe.tags || []).slice(0, 6).map((tag, index) => {
            // Handle both string tags and object tags from database
            const tagValue = typeof tag === 'string' ? tag : tag.tag || tag.name || String(tag);
            const tagKey = typeof tag === 'string' ? tag : `${tag.tagId || tag.id || index}-${tagValue}`;

            return (
              <Badge key={tagKey} variant="outline" className="text-xs">
                {tagValue}
              </Badge>
            );
          })}
          {(recipe.tags || []).length > 6 && (
            <Badge variant="outline" className="text-xs">
              +{(recipe.tags || []).length - 6}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => onView(recipe)}
            variant="recipe"
            className="flex-1"
          >
            Ver Receta
          </Button>
          {onPlayTTS && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onPlayTTS(recipe);
              }}
              className="px-3 h-10 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
              title={isPlayingTTS ? "Pausar audio" : "Escuchar receta"}
              disabled={isGeneratingScript}
            >
              {isGeneratingScript ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              ) : isPlayingTTS ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};