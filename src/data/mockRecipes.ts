import { Recipe } from "@/components/RecipeCard";
import pastaImage from "@/assets/recipe-pasta.jpg";
import breadImage from "@/assets/recipe-bread.jpg";
import soupImage from "@/assets/recipe-soup.jpg";

// Mock recipes with user assignments
export const mockRecipes: Recipe[] = [
  {
    id: "1",
    userId: "1", // Demo user
    title: "Pasta con Salsa de Tomate Casera",
    description: "Una deliciosa pasta con salsa de tomate fresco preparada completamente en Thermomix. Perfecta para toda la familia.",
    image: pastaImage,
    prepTime: 35,
    servings: 4,
    difficulty: "Fácil",
    tags: ["Pasta", "Italiana", "Vegetariana", "Familiar"]
  },
  {
    id: "2", 
    userId: "1", // Demo user
    title: "Pan Integral Casero",
    description: "Pan integral esponjoso y nutritivo preparado desde cero en Thermomix. Ideal para desayunos saludables.",
    image: breadImage,
    prepTime: 180,
    servings: 8,
    difficulty: "Medio",
    tags: ["Pan", "Integral", "Saludable", "Horno"]
  },
  {
    id: "3",
    userId: "2", // Chef María
    title: "Crema de Verduras con Hierbas",
    description: "Una suave y cremosa sopa de verduras frescas con un toque de hierbas aromáticas. Perfecta para días fríos.",
    image: soupImage,
    prepTime: 45,
    servings: 6,
    difficulty: "Fácil",
    tags: ["Sopa", "Verduras", "Saludable", "Vegana"]
  }
];