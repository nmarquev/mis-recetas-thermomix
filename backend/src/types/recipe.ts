export interface RecipeImage {
  id: string;
  url: string;
  localPath?: string;
  order: number;
  altText?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit?: string;
  order: number;
}

export interface Instruction {
  id: string;
  step: number;
  description: string;
  thermomixSettings?: {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeImportResponse {
  title: string;
  description?: string;
  images: Array<{
    url: string;
    altText?: string;
    order: number;
  }>;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
  }>;
  prepTime: number;
  cookTime?: number;
  servings: number;
  difficulty: "Fácil" | "Medio" | "Difícil";
  recipeType?: string;
  tags: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}