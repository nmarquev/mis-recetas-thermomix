import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, ChevronDown, X } from "lucide-react";
import { Recipe } from "@/components/RecipeCard";

export interface RecipeFilters {
  difficulty: string[];
  prepTimeRange: [number, number];
  servingsRange: [number, number];
  tags: string[];
}

interface FilterPanelProps {
  recipes: Recipe[];
  filters: RecipeFilters;
  onFiltersChange: (filters: RecipeFilters) => void;
  onClearFilters: () => void;
}

export const FilterPanel = ({ recipes, filters, onFiltersChange, onClearFilters }: FilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Extract unique values from recipes
  const difficulties = ["Fácil", "Medio", "Difícil"];
  const allTags = Array.from(new Set(recipes.flatMap(recipe => recipe.tags))).sort();
  const maxPrepTime = Math.max(...recipes.map(r => r.prepTime), 180);
  const maxServings = Math.max(...recipes.map(r => r.servings), 12);

  const handleDifficultyChange = (difficulty: string, checked: boolean) => {
    const newDifficulties = checked 
      ? [...filters.difficulty, difficulty]
      : filters.difficulty.filter(d => d !== difficulty);
    
    onFiltersChange({
      ...filters,
      difficulty: newDifficulties
    });
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    const newTags = checked 
      ? [...filters.tags, tag]
      : filters.tags.filter(t => t !== tag);
    
    onFiltersChange({
      ...filters,
      tags: newTags
    });
  };

  const handlePrepTimeChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      prepTimeRange: [value[0], value[1]]
    });
  };

  const handleServingsChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      servingsRange: [value[0], value[1]]
    });
  };

  const hasActiveFilters = 
    filters.difficulty.length > 0 ||
    filters.tags.length > 0 ||
    filters.prepTimeRange[0] > 0 ||
    filters.prepTimeRange[1] < maxPrepTime ||
    filters.servingsRange[0] > 1 ||
    filters.servingsRange[1] < maxServings;

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Filtros</CardTitle>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-xs">
                    Activos
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearFilters();
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3" />
                    Limpiar
                  </Button>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 p-4">
            {/* Difficulty Filter */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Dificultad</Label>
              <div className="flex flex-wrap gap-1">
                {difficulties.map((difficulty) => (
                  <div key={difficulty} className="flex items-center space-x-1">
                    <Checkbox
                      id={`difficulty-${difficulty}`}
                      checked={filters.difficulty.includes(difficulty)}
                      onCheckedChange={(checked) => 
                        handleDifficultyChange(difficulty, checked as boolean)
                      }
                      className="h-3 w-3"
                    />
                    <Label 
                      htmlFor={`difficulty-${difficulty}`}
                      className="text-xs cursor-pointer"
                    >
                      {difficulty}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Prep Time Filter */}
            <div>
              <Label className="text-xs font-medium mb-2 block">
                Tiempo ({filters.prepTimeRange[0]}-{filters.prepTimeRange[1]} min)
              </Label>
              <Slider
                value={filters.prepTimeRange}
                onValueChange={handlePrepTimeChange}
                max={maxPrepTime}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Servings Filter */}
            <div>
              <Label className="text-xs font-medium mb-2 block">
                Porciones ({filters.servingsRange[0]}-{filters.servingsRange[1]})
              </Label>
              <Slider
                value={filters.servingsRange}
                onValueChange={handleServingsChange}
                max={maxServings}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Tags Filter */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Categorías</Label>
              <div className="grid grid-cols-1 gap-1 max-h-24 overflow-y-auto">
                {allTags.slice(0, 6).map((tag) => (
                  <div key={tag} className="flex items-center space-x-1">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={filters.tags.includes(tag)}
                      onCheckedChange={(checked) => 
                        handleTagChange(tag, checked as boolean)
                      }
                      className="h-3 w-3"
                    />
                    <Label 
                      htmlFor={`tag-${tag}`}
                      className="text-xs cursor-pointer truncate"
                    >
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};