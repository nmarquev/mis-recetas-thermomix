// Background service worker for TasteBox extension
importScripts('config.js');

// State management
let isAuthenticated = false;
let authToken = null;

// Check authentication status on startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('TasteBox extension installed');
  checkAuthStatus();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('TasteBox extension started');
  checkAuthStatus();
});

// Check if user is authenticated
async function checkAuthStatus() {
  try {
    // Load environment settings from storage
    const result = await chrome.storage.local.get(['authToken', 'isDevelopment', 'customDevelopment']);
    authToken = result.authToken || null;

    // Update CONFIG with current settings
    const isDev = result.isDevelopment !== undefined ? result.isDevelopment : CONFIG.isDevelopment;
    CONFIG.isDevelopment = isDev;
    if (result.customDevelopment) {
      CONFIG.setDevelopmentConfig(result.customDevelopment);
    }

    if (authToken) {
      // Verify token is still valid
      const response = await fetch(CONFIG.getEndpoint('me'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        isAuthenticated = true;
        const userData = await response.json();
        await chrome.storage.local.set({ user: userData });
        updateIcon(true);
      } else {
        // Token invalid, clear it
        isAuthenticated = false;
        authToken = null;
        await chrome.storage.local.remove(['authToken', 'user']);
        updateIcon(false);
      }
    } else {
      isAuthenticated = false;
      updateIcon(false);
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    isAuthenticated = false;
    updateIcon(false);
  }
}

// Update extension icon based on auth status
function updateIcon(authenticated) {
  // Keep icon always the same (orange TasteBox logo)
  // Use badge to indicate authentication status instead

  if (authenticated) {
    // Authenticated: no badge, just the orange icon
    chrome.action.setBadgeText({ text: '' });
  } else {
    // Not authenticated: show "!" badge with gray background
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#9CA3AF' });
  }

  const title = authenticated
    ? 'TasteBox - Guarda recetas'
    : 'TasteBox - Inicia sesión para guardar recetas';
  chrome.action.setTitle({ title });
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'checkAuth':
      sendResponse({
        isAuthenticated,
        authToken
      });
      break;

    case 'login':
      handleLogin(request.email, request.password)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case 'logout':
      handleLogout()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'importRecipe':
      handleImportRecipe(request.url, request.html)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle login
async function handleLogin(email, password) {
  try {
    // Load current environment settings from storage before login
    const result = await chrome.storage.local.get(['isDevelopment', 'customDevelopment']);
    const isDev = result.isDevelopment !== undefined ? result.isDevelopment : CONFIG.isDevelopment;

    // Update CONFIG with current settings
    CONFIG.isDevelopment = isDev;
    if (result.customDevelopment) {
      CONFIG.setDevelopmentConfig(result.customDevelopment);
    }

    console.log('🔧 Login using environment:', isDev ? 'Development' : 'Production');
    console.log('🌐 API URL:', CONFIG.getApiUrl());

    const response = await fetch(CONFIG.getEndpoint('login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok && data.token) {
      authToken = data.token;
      isAuthenticated = true;

      await chrome.storage.local.set({
        authToken: data.token,
        user: data.user
      });

      updateIcon(true);

      return {
        success: true,
        user: data.user
      };
    } else {
      return {
        success: false,
        error: data.message || 'Login failed'
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle logout
async function handleLogout() {
  authToken = null;
  isAuthenticated = false;
  await chrome.storage.local.remove(['authToken', 'user']);
  updateIcon(false);
}

// Handle recipe import
async function handleImportRecipe(url, html) {
  if (!isAuthenticated || !authToken) {
    return {
      success: false,
      error: 'Not authenticated'
    };
  }

  try {
    // Load current environment settings from storage
    const result = await chrome.storage.local.get(['isDevelopment', 'customDevelopment']);
    const isDev = result.isDevelopment !== undefined ? result.isDevelopment : CONFIG.isDevelopment;

    // Update CONFIG with current settings
    CONFIG.isDevelopment = isDev;
    if (result.customDevelopment) {
      CONFIG.setDevelopmentConfig(result.customDevelopment);
    }

    console.log('🔧 Import using environment:', isDev ? 'Development' : 'Production');
    console.log('🌐 API URL:', CONFIG.getApiUrl());

    // Use /api/import (same as web app) instead of /api/import-html
    // This ensures consistent extraction with better results
    const response = await fetch(`${CONFIG.getApiUrl()}/api/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url  // Only send URL, let backend fetch HTML with proper User-Agent
      }),
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        recipe: data.recipe || data
      };
    } else {
      return {
        success: false,
        error: data.message || 'Import failed'
      };
    }
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check server health
async function checkServerHealth() {
  try {
    const response = await fetch(CONFIG.getEndpoint('health'), {
      method: 'GET'
    });

    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        version: data.version
      };
    }
    return { available: false };
  } catch (error) {
    console.error('Health check failed:', error);
    return { available: false };
  }
}