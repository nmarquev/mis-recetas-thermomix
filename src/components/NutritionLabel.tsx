import React from 'react';
import { Calculator } from 'lucide-react';

interface NutritionLabelProps {
  nutrition: {
    calories?: number | null;
    protein?: number | null;
    carbohydrates?: number | null;
    fat?: number | null;
    fiber?: number | null;
    sugar?: number | null;
    sodium?: number | null;
  };
  servings?: number;
  showCalculateButton?: boolean;
  onCalculate?: () => void;
  isCalculating?: boolean;
}

export const NutritionLabel: React.FC<NutritionLabelProps> = ({
  nutrition,
  servings = 1,
  showCalculateButton = false,
  onCalculate,
  isCalculating = false
}) => {
  const hasNutritionData = nutrition.calories || nutrition.protein || nutrition.carbohydrates || nutrition.fat;

  if (!hasNutritionData && !showCalculateButton) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-gray-800 p-4 text-sm font-mono max-w-xs">
      {/* Header */}
      <div className="border-b-8 border-gray-800 pb-1 mb-2">
        <h3 className="text-xl font-bold text-gray-900">Información Nutricional</h3>
        <p className="text-xs text-gray-600">Por porción</p>
        {servings > 1 && <p className="text-xs text-gray-600">Porciones: {servings}</p>}
      </div>

      {hasNutritionData ? (
        <>
          {/* Calories */}
          {nutrition.calories && (
            <div className="border-b border-gray-400 py-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Calorías</span>
                <span className="font-bold text-lg">{Math.round(nutrition.calories)}</span>
              </div>
            </div>
          )}

          <div className="border-b-4 border-gray-800 py-1 mb-2">
            <p className="text-xs text-gray-600 text-right">% Valor Diario*</p>
          </div>

          {/* Macronutrients */}
          <div className="space-y-1">
            {nutrition.fat !== null && nutrition.fat !== undefined && (
              <div className="flex justify-between border-b border-gray-300 py-1">
                <span className="font-bold">Grasa Total</span>
                <span>{nutrition.fat.toFixed(1)}g</span>
              </div>
            )}

            {nutrition.sodium !== null && nutrition.sodium !== undefined && (
              <div className="flex justify-between border-b border-gray-300 py-1">
                <span className="font-bold">Sodio</span>
                <span>{Math.round(nutrition.sodium)}mg</span>
              </div>
            )}

            {nutrition.carbohydrates !== null && nutrition.carbohydrates !== undefined && (
              <div className="flex justify-between border-b border-gray-300 py-1">
                <span className="font-bold">Carbohidratos Totales</span>
                <span>{nutrition.carbohydrates.toFixed(1)}g</span>
              </div>
            )}

            {nutrition.fiber !== null && nutrition.fiber !== undefined && (
              <div className="flex justify-between border-b border-gray-300 py-1 pl-4">
                <span>Fibra Dietética</span>
                <span>{nutrition.fiber.toFixed(1)}g</span>
              </div>
            )}

            {nutrition.sugar !== null && nutrition.sugar !== undefined && (
              <div className="flex justify-between border-b border-gray-300 py-1 pl-4">
                <span>Azúcares Totales</span>
                <span>{nutrition.sugar.toFixed(1)}g</span>
              </div>
            )}

            {nutrition.protein !== null && nutrition.protein !== undefined && (
              <div className="flex justify-between border-b border-gray-300 py-1">
                <span className="font-bold">Proteína</span>
                <span>{nutrition.protein.toFixed(1)}g</span>
              </div>
            )}
          </div>

          <div className="border-t-4 border-gray-800 pt-2 mt-2">
            <p className="text-xs text-gray-600">
              * Los porcentajes de Valores Diarios están basados en una dieta de 2,000 calorías.
            </p>
          </div>
        </>
      ) : (
        <div className="py-4 text-center text-gray-500">
          <p className="mb-2">No hay información nutricional disponible</p>
        </div>
      )}

      {showCalculateButton && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <button
            onClick={onCalculate}
            disabled={isCalculating}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" />
            {isCalculating ? 'Calculando...' : 'Calcular Nutrientes'}
          </button>
        </div>
      )}
    </div>
  );
};