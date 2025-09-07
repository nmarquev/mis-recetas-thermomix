import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Download } from "lucide-react";

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddRecipe: () => void;
  onImportRecipe: () => void;
}

export const Header = ({ 
  searchTerm, 
  onSearchChange, 
  onAddRecipe, 
  onImportRecipe 
}: HeaderProps) => {
  return (
    <header className="bg-gradient-warm border-b border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">🥄</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Mis Recetas Thermomix
                </h1>
                <p className="text-muted-foreground text-sm">
                  Tu colección personal de recetas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar recetas..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button 
                onClick={onImportRecipe}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
              
              <Button 
                onClick={onAddRecipe}
                variant="recipe"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva Receta</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};