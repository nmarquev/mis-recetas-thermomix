import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Recipe } from '@/types/recipe';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

interface DeleteRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onRecipeDeleted: (recipeId: string) => void;
}

export const DeleteRecipeDialog = ({ isOpen, onClose, recipe, onRecipeDeleted }: DeleteRecipeDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!recipe) return;

    setIsDeleting(true);

    try {
      await api.recipes.delete(recipe.id);

      onRecipeDeleted(recipe.id);
      onClose();

      toast({
        title: "Receta eliminada",
        description: `"${recipe.title}" ha sido eliminada exitosamente`,
      });
    } catch (error) {
      console.error('Delete recipe error:', error);
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar la receta",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!recipe) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            ¿Eliminar receta?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar la receta{' '}
            <span className="font-semibold">"{recipe.title}"</span>.
            {' '}Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};