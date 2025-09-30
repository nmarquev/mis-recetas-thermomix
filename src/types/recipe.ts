export interface RecipeImage {
  id?: string;
  url: string;
  localPath?: string;
  order: number;
  altText?: string;
}

export interface Ingredient {
  id?: string;
  name: string;
  amount: string;
  unit?: string;
  order: number;
  section?: string; // Section for multi-part recipes (e.g., "Plato principal", "Salsa")
}

export interface Instruction {
  id?: string;
  step: number;
  description: string;
  section?: string; // Section for multi-part recipes
  thermomixSettings?: {
    function?: string; // Thermomix function (e.g., "Amasar", "Batir", "Picar")
    time?: string;
    temperature?: string;
    speed?: string;
  };
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description?: string;
  images: RecipeImage[];
  prepTime: number;
  cookTime?: number;
  servings: number;
  difficulty: "Fácil" | "Medio" | "Difícil";
  tags: string[];
  ingredients: Ingredient[];
  instructions: Instruction[];
  sourceUrl?: string;
  recipeType?: string;
  featured?: boolean;
  locution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportRecipeResponse {
  success: boolean;
  recipe?: {
    title: string;
    description?: string;
    prepTime: number;
    cookTime?: number;
    servings: number;
    difficulty: "Fácil" | "Medio" | "Difícil";
    recipeType?: string;
    sourceUrl?: string;
    images: RecipeImage[];
    ingredients: Ingredient[];
    instructions: Instruction[];
    tags: string[];
  };
  preview?: boolean;
  error?: string;
}