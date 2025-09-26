import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, Edit, Trash2, MoreVertical, Heart } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Recipe } from "@/types/recipe";
import { resolveImageUrl } from "@/utils/api";
import { isThermomixRecipe } from "@/utils/recipeUtils";

interface RecipeCardProps {
  recipe: Recipe;
  onView: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  columns?: 2 | 3 | 4;
}

export const RecipeCard = ({ recipe, onView, onEdit, onDelete, onToggleFavorite, columns = 3 }: RecipeCardProps) => {
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
          {(onEdit || onDelete) && (
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
          )}
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
        <div>
          <h3 className="font-semibold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
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
        
        <Button 
          onClick={() => onView(recipe)}
          variant="recipe"
          className="w-full"
        >
          Ver Receta
        </Button>
      </CardContent>
    </Card>
  );
};