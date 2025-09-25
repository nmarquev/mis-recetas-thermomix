import { LLMService } from './llmService';

export interface CookidooAuth {
  username: string;
  password: string;
}

export interface CookidooSession {
  cookies: string;
  authenticated: boolean;
  expires: Date;
}

export class CookidooService {
  private llmService: LLMService;
  private sessions: Map<string, CookidooSession> = new Map();

  constructor() {
    this.llmService = new LLMService();
  }

  async extractRecipeWithAuth(url: string, auth: CookidooAuth): Promise<any> {
    console.log('\n🔐 COOKIDOO AUTHENTICATED EXTRACTION');
    console.log('📍 URL:', url);
    console.log('👤 Username:', auth.username);

    // 1. Verificar si ya tenemos una sesión válida para este usuario
    const sessionKey = auth.username;
    let session = this.sessions.get(sessionKey);

    if (!session || !this.isSessionValid(session)) {
      console.log('🔄 No valid session found, logging in...');
      session = await this.loginToCookidoo(auth);
      this.sessions.set(sessionKey, session);
    } else {
      console.log('✅ Using existing valid session');
    }

    // 2. Hacer fetch con cookies de autenticación
    console.log('🌐 Fetching authenticated content...');
    const html = await this.fetchAuthenticatedContent(url, session);

    // 3. Extraer receta con LLM
    console.log('🤖 Extracting recipe data...');
    return await this.llmService.extractRecipeFromHtml(html, url);
  }

  private async loginToCookidoo(auth: CookidooAuth): Promise<CookidooSession> {
    console.log('\n=== 🔐 COOKIDOO LOGIN START ===');

    try {
      // 1. Obtener página de login
      console.log('📄 Getting login page...');
      const loginPageResponse = await fetch('https://cookidoo.es/profile/es/login', {
        headers: this.getBrowserHeaders(),
        redirect: 'follow'
      });

      if (!loginPageResponse.ok) {
        throw new Error(`Failed to load login page: ${loginPageResponse.status}`);
      }

      const loginPageHtml = await loginPageResponse.text();
      const loginCookies = this.extractCookiesFromResponse(loginPageResponse);

      // 2. Extraer tokens CSRF o campos hidden necesarios
      const csrfToken = this.extractCSRFToken(loginPageHtml);

      // 3. Enviar credenciales de login al servicio externo
      console.log('🔑 Submitting login credentials to external auth service...');
      const loginData = new URLSearchParams({
        username: auth.username,
        password: auth.password,
        ...(csrfToken && { _token: csrfToken })
      });

      // Cookidoo usa un servicio de autenticación externo
      const loginResponse = await fetch('https://ciam.prod.cookidoo.vorwerk-digital.com/login-srv/login', {
        method: 'POST',
        headers: {
          ...this.getBrowserHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': loginCookies,
          'Referer': 'https://cookidoo.es/profile/es/login',
          'Origin': 'https://ciam.prod.cookidoo.vorwerk-digital.com'
        },
        body: loginData.toString(),
        redirect: 'manual' // Para capturar redirects
      });

      // 4. Verificar login exitoso
      const authCookies = this.extractCookiesFromResponse(loginResponse);
      const allCookies = this.combineCookies(loginCookies, authCookies);

      // Verificar si tenemos la cookie de autenticación
      console.log('🔍 All cookies received:', allCookies);
      console.log('🔍 Login response status:', loginResponse.status);
      console.log('🔍 Login response headers:', Object.fromEntries(loginResponse.headers.entries()));

      if (!allCookies.includes('v-authenticated=true') && !allCookies.includes('authenticated') && !allCookies.includes('session')) {
        console.log('❌ No authentication cookies found in:', allCookies);
        throw new Error('Login failed - authentication cookie not found. This could mean invalid credentials or Cookidoo changed their login process.');
      }

      console.log('✅ Login successful!');

      const session: CookidooSession = {
        cookies: allCookies,
        authenticated: true,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      };

      console.log('=== 🔐 COOKIDOO LOGIN END ===\n');
      return session;

    } catch (error) {
      console.error('❌ Login failed:', error);
      throw new Error(`Cookidoo login failed: ${error.message}`);
    }
  }

  private async fetchAuthenticatedContent(url: string, session: CookidooSession): Promise<string> {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 Authenticated fetch attempt ${attempt + 1}/${maxRetries}`);

        const response = await fetch(url, {
          headers: {
            ...this.getBrowserHeaders(),
            'Cookie': session.cookies,
            'Referer': 'https://cookidoo.es/foundation/es'
          },
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Verificar que tenemos contenido autenticado
        if (html.includes('is-authenticated') && !html.includes('is-unauthenticated')) {
          console.log('✅ Authenticated content received');
          console.log('📏 Content length:', html.length, 'characters');
          return html;
        } else {
          console.log('⚠️ Content appears to be unauthenticated, retrying...');
          if (attempt < maxRetries - 1) {
            await this.delay(2000 * (attempt + 1));
            continue;
          }
        }

        return html; // Return even if not clearly authenticated

      } catch (error) {
        console.log(`❌ Attempt ${attempt + 1} failed:`, error.message);
        if (attempt < maxRetries - 1) {
          await this.delay(2000 * (attempt + 1));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to fetch authenticated content after all retries');
  }

  private getBrowserHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'max-age=0'
    };
  }

  private extractCookiesFromResponse(response: Response): string {
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    return setCookieHeaders
      .map(cookie => cookie.split(';')[0])
      .join('; ');
  }

  private combineCookies(existing: string, newCookies: string): string {
    const existingMap = new Map();
    const newMap = new Map();

    // Parse existing cookies
    existing.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) existingMap.set(key, value);
    });

    // Parse new cookies
    newCookies.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) newMap.set(key, value);
    });

    // Combine (new cookies override existing)
    const combined = new Map([...existingMap, ...newMap]);

    return Array.from(combined.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  private extractCSRFToken(html: string): string | null {
    // Buscar token CSRF en formularios o meta tags
    const csrfMatches = [
      html.match(/name="_token"[^>]*value="([^"]+)"/),
      html.match(/content="([^"]+)"[^>]*name="csrf-token"/),
      html.match(/name="csrf-token"[^>]*content="([^"]+)"/),
    ];

    for (const match of csrfMatches) {
      if (match?.[1]) {
        console.log('🔒 CSRF token found');
        return match[1];
      }
    }

    console.log('⚠️ No CSRF token found');
    return null;
  }

  private isSessionValid(session: CookidooSession): boolean {
    return session.authenticated && session.expires > new Date();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Limpiar sesiones expiradas
  public cleanExpiredSessions(): void {
    const now = new Date();
    for (const [key, session] of this.sessions.entries()) {
      if (session.expires <= now) {
        this.sessions.delete(key);
      }
    }
  }
}