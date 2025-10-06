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
    const result = await chrome.storage.local.get(['authToken']);
    authToken = result.authToken || null;

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
  // Use different icons for authenticated vs not authenticated
  const iconSet = authenticated ? {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png'
  } : {
    '16': 'icons/icon16-gray.png',
    '32': 'icons/icon32-gray.png',
    '48': 'icons/icon48-gray.png',
    '128': 'icons/icon128-gray.png'
  };

  chrome.action.setIcon({ path: iconSet });

  const title = authenticated
    ? 'TasteBox - Click to import recipe'
    : 'TasteBox - Please log in';
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
    const response = await fetch(CONFIG.getEndpoint('importHtml'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        html
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