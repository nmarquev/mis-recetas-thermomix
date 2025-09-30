import { Recipe, Instruction } from "@/types/recipe";

/**
 * Determina si una receta es específica de Thermomix basándose en los pasos
 * Una receta es considerada Thermomix si al menos uno de sus pasos tiene configuraciones específicas
 * @param recipe - La receta a evaluar
 * @returns true si es una receta de Thermomix, false en caso contrario
 */
export function isThermomixRecipe(recipe: Recipe): boolean {
  if (!recipe.instructions || recipe.instructions.length === 0) {
    return false;
  }

  // Verificar si algún paso tiene configuraciones de Thermomix
  return recipe.instructions.some(instruction => {
    const settings = instruction.thermomixSettings;
    return settings && (
      (settings.time && settings.time.trim() !== '') ||
      (settings.temperature && settings.temperature.trim() !== '') ||
      (settings.speed && settings.speed.trim() !== '')
    );
  });
}

/**
 * Determina si una instrucción individual tiene configuraciones de Thermomix
 * @param instruction - La instrucción a evaluar
 * @returns true si tiene configuraciones de Thermomix, false en caso contrario
 */
export function hasThermomixSettings(instruction: Instruction): boolean {
  const settings = instruction.thermomixSettings;
  return settings && (
    (settings.function && settings.function.trim() !== '') ||
    (settings.time && settings.time.trim() !== '') ||
    (settings.temperature && settings.temperature.trim() !== '') ||
    (settings.speed && settings.speed.trim() !== '')
  );
}

/**
 * Obtiene un array de configuraciones de Thermomix formateadas para mostrar
 * @param instruction - La instrucción con configuraciones
 * @returns Array de strings formateadas con las configuraciones
 */
export function getThermomixSettingsDisplay(instruction: Instruction): string[] {
  const settings = instruction.thermomixSettings;
  if (!settings) return [];

  const display: string[] = [];

  if (settings.function && settings.function.trim() !== '') {
    display.push(`🔧 ${settings.function}`);
  }

  if (settings.time && settings.time.trim() !== '') {
    display.push(`⏱️ ${settings.time}`);
  }

  if (settings.temperature && settings.temperature.trim() !== '') {
    display.push(`🌡️ ${settings.temperature}`);
  }

  if (settings.speed && settings.speed.trim() !== '') {
    display.push(`⚡ ${settings.speed}`);
  }

  return display;
}

/**
 * Elimina emojis de un texto
 * @param text - El texto del cual eliminar emojis
 * @returns El texto sin emojis
 */
export function removeEmojis(text: string): string {
  // Regex que detecta la mayoría de emojis Unicode
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2194}-\u{2199}]|[\u{21A9}-\u{21AA}]|[\u{231A}]|[\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{25FD}-\u{25FE}]|[\u{2614}]|[\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}]|[\u{26AB}]|[\u{26BD}]|[\u{26BE}]|[\u{26C4}]|[\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}]|[\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2705}]|[\u{270A}]|[\u{270B}]|[\u{2728}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2795}-\u{2797}]|[\u{27B0}]|[\u{27BF}]|[\u{2B1B}]|[\u{2B1C}]|[\u{2B50}]|[\u{2B55}]/gu;

  return text.replace(emojiRegex, '').trim();
}

/**
 * Limpia un título de receta eliminando emojis y espacios extra
 * @param title - El título a limpiar
 * @returns El título limpio
 */
export function cleanRecipeTitle(title: string): string {
  return removeEmojis(title).replace(/\s+/g, ' ').trim();
}