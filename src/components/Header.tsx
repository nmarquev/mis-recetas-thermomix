import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Download, User, LogOut, Settings, FileText, Volume2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EditProfileModal } from "@/components/EditProfileModal";
import { DocxImportModal } from "@/components/DocxImportModal";
import { PdfImportModal } from "@/components/pdf/PdfImportModal";
import { IntelligentSearchModal } from "@/components/IntelligentSearchModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { VoiceSettingsModal } from "@/components/VoiceSettingsModal";

interface HeaderProps {
  onAddRecipe: () => void;
  onImportRecipe: () => void;
  onRecipeAdded?: () => void;
  onViewRecipe?: (recipe: any) => void;
}

export const Header = ({
  onAddRecipe,
  onImportRecipe,
  onRecipeAdded,
  onViewRecipe
}: HeaderProps) => {
  const { user, logout } = useAuth();
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isDocxImportModalOpen, setIsDocxImportModalOpen] = useState(false);
  const [isPdfImportModalOpen, setIsPdfImportModalOpen] = useState(false);
  const [isVoiceSettingsModalOpen, setIsVoiceSettingsModalOpen] = useState(false);
  const [isIntelligentSearchModalOpen, setIsIntelligentSearchModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="bg-gradient-warm border-b border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <img
                src="/tastebox.png"
                alt="TasteBox"
                className="h-16 object-contain"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <ThemeSwitcher />

              <Button
                onClick={() => setIsIntelligentSearchModalOpen(true)}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2 bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 border-orange-200 transition-all duration-200 hover:scale-105 hover:shadow-md"
                title="Búsqueda Inteligente con IA"
              >
                <Sparkles className="h-4 w-4 text-orange-600 animate-pulse" />
                <span className="hidden sm:inline text-orange-700 font-medium">IA</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Importar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onImportRecipe}>
                    <Download className="mr-2 h-4 w-4" />
                    Online
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDocxImportModalOpen(true)}>
                    <FileText className="mr-2 h-4 w-4 text-blue-600" />
                    DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPdfImportModalOpen(true)}>
                    <FileText className="mr-2 h-4 w-4 text-purple-600" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={onAddRecipe}
                variant="recipe"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva Receta</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user?.profilePhoto ? `http://localhost:3002${user.profilePhoto}` : undefined}
                        alt={user?.name || 'Usuario'}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getUserInitials(user?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsEditProfileModalOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Editar perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsVoiceSettingsModalOpen(true)}>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Configuración de voz
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
      />

      <DocxImportModal
        isOpen={isDocxImportModalOpen}
        onClose={() => setIsDocxImportModalOpen(false)}
        onRecipeSaved={(recipeId) => {
          console.log('Recipe saved from DOCX:', recipeId);
          onRecipeAdded?.(); // Refresh the recipes list
        }}
      />

      <PdfImportModal
        isOpen={isPdfImportModalOpen}
        onClose={() => setIsPdfImportModalOpen(false)}
        onRecipeSaved={(recipeId) => {
          console.log('Recipe saved from PDF:', recipeId);
          onRecipeAdded?.(); // Refresh the recipes list
        }}
      />

      <VoiceSettingsModal
        isOpen={isVoiceSettingsModalOpen}
        onClose={() => setIsVoiceSettingsModalOpen(false)}
      />

      <IntelligentSearchModal
        isOpen={isIntelligentSearchModalOpen}
        onClose={() => setIsIntelligentSearchModalOpen(false)}
        onRecipeSaved={(recipeId) => {
          console.log('Recipe saved from AI search:', recipeId);
          onRecipeAdded?.(); // Refresh the recipes list
        }}
        onViewRecipe={onViewRecipe}
      />
    </header>
  );
};