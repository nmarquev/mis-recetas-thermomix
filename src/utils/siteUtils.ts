/**
 * Extrae el nombre del sitio web de una URL para mostrarlo en el enlace "Ver en..."
 * @param url - La URL original del sitio
 * @returns El nombre del sitio web o "Sitio original" si no se reconoce
 */
export function getSiteName(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Mapa de sitios web conocidos
    const siteMap: Record<string, string> = {
      'cookpad.com': 'Cookpad',
      'allrecipes.com': 'Allrecipes',
      'food.com': 'Food.com',
      'delicious.com.au': 'Delicious',
      'bbc.co.uk': 'BBC Good Food',
      'epicurious.com': 'Epicurious',
      'foodnetwork.com': 'Food Network',
      'tastykitchen.com': 'Tasty Kitchen',
      'simplyrecipes.com': 'Simply Recipes',
      'seriouseats.com': 'Serious Eats',
      'bonappetit.com': 'Bon Appétit',
      'food52.com': 'Food52',
      'chefkoch.de': 'Chefkoch',
      'marmiton.org': 'Marmiton',
      'cuisine.az': 'Cuisine AZ',
      'recetasgratis.net': 'RecetasGratis',
      'directoalpaladar.com': 'Directo al Paladar',
      'kiwilimon.com': 'KiwiLimón',
      'cocina-casera.com': 'Cocina Casera',
      'gastronomiaycia.com': 'Gastronomía y Cía',
      'thermorecetas.com': 'ThermoRecetas',
      'recetastermomix.net': 'Recetas Thermomix',
      'velocidad-cuchara.com': 'Velocidad Cuchara',
      'robots-de-cocina.com': 'Robots de Cocina'
    };

    // Buscar coincidencia exacta
    if (siteMap[hostname]) {
      return siteMap[hostname];
    }

    // Buscar coincidencia parcial (para subdominios)
    for (const [domain, name] of Object.entries(siteMap)) {
      if (hostname.includes(domain)) {
        return name;
      }
    }

    // Si no se encuentra, extraer el dominio principal
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      const mainDomain = domainParts[domainParts.length - 2];
      // Capitalizar la primera letra
      return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
    }

    return 'Sitio original';
  } catch (error) {
    return 'Sitio original';
  }
}

/**
 * Verifica si una URL es válida y accesible
 * @param url - La URL a verificar
 * @returns true si la URL es válida, false en caso contrario
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}