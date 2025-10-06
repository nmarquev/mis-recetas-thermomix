// Configuration for TasteBox API
const CONFIG = {
  // Development mode - set to false for production
  isDevelopment: false,

  // Default ports for development
  defaultPorts: {
    backend: 3005,
    frontend: 8080
  },

  // Custom ports (loaded from storage)
  customPorts: null,

  // API URLs
  development: {
    apiUrl: 'https://localhost:3005',
    frontendUrl: 'http://localhost:8080'
  },

  production: {
    apiUrl: 'https://tastebox.beweb.com.ar',
    frontendUrl: 'https://tastebox.beweb.com.ar'
  },

  // Set custom development ports
  setDevelopmentPorts(backendPort, frontendPort) {
    this.customPorts = { backend: backendPort, frontend: frontendPort };
    this.development.apiUrl = `https://localhost:${backendPort}`;
    this.development.frontendUrl = `http://localhost:${frontendPort}`;
  },

  // Get current API URL based on environment
  getApiUrl() {
    return this.isDevelopment ? this.development.apiUrl : this.production.apiUrl;
  },

  // Get current frontend URL based on environment
  getFrontendUrl() {
    return this.isDevelopment ? this.development.frontendUrl : this.production.frontendUrl;
  },

  // API endpoints
  endpoints: {
    health: '/api/health',
    auth: '/api/auth',
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    importHtml: '/api/import-html',
    recipes: '/api/recipes'
  },

  // Get full endpoint URL
  getEndpoint(endpoint) {
    return this.getApiUrl() + (this.endpoints[endpoint] || endpoint);
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}