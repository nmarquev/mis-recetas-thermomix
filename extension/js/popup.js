// Popup script for TasteBox extension
let currentUser = null;
let isAuthenticated = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  console.log('TasteBox popup loaded');
  initializePopup();
  setupEventListeners();
});

// Initialize popup state
async function initializePopup() {
  showLoading(true);

  // Check auth status
  const authStatus = await checkAuthStatus();

  if (authStatus.isAuthenticated && authStatus.user) {
    isAuthenticated = true;
    currentUser = authStatus.user;
    showAuthenticatedView();
    detectRecipeOnCurrentTab();
  } else {
    isAuthenticated = false;
    currentUser = null;
    showNotAuthenticatedView();
  }

  // Load environment setting
  const result = await chrome.storage.local.get(['isDevelopment']);
  const isDev = result.isDevelopment !== undefined ? result.isDevelopment : CONFIG.isDevelopment;
  document.getElementById('environment-toggle').checked = isDev;
  CONFIG.isDevelopment = isDev;

  showLoading(false);
}

// Check authentication status
async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'checkAuth' }, async (response) => {
      if (response && response.isAuthenticated) {
        // Get user data from storage
        const result = await chrome.storage.local.get(['user']);
        resolve({
          isAuthenticated: true,
          user: result.user
        });
      } else {
        resolve({
          isAuthenticated: false
        });
      }
    });
  });
}

// Show authenticated view
function showAuthenticatedView() {
  document.getElementById('not-authenticated').style.display = 'none';
  document.getElementById('authenticated').style.display = 'block';

  // Update user info
  if (currentUser) {
    const initials = getUserInitials(currentUser.name || currentUser.email);
    document.getElementById('user-initials').textContent = initials;
    document.getElementById('user-name').textContent = currentUser.name || 'Usuario';
    document.getElementById('user-email').textContent = currentUser.email;
  }
}

// Show not authenticated view
function showNotAuthenticatedView() {
  document.getElementById('not-authenticated').style.display = 'block';
  document.getElementById('authenticated').style.display = 'none';
}

// Get user initials
function getUserInitials(name) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Setup event listeners
function setupEventListeners() {
  // Login form
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  // Open app button
  document.getElementById('open-app-button')?.addEventListener('click', () => {
    chrome.tabs.create({ url: CONFIG.getFrontendUrl() });
  });

  // Logout button
  document.getElementById('logout-button')?.addEventListener('click', handleLogout);

  // Import button
  document.getElementById('import-button')?.addEventListener('click', handleImportClick);

  // View recipes button
  document.getElementById('view-recipes-button')?.addEventListener('click', () => {
    chrome.tabs.create({ url: CONFIG.getFrontendUrl() });
  });

  // Environment toggle
  document.getElementById('environment-toggle')?.addEventListener('change', async (e) => {
    CONFIG.isDevelopment = e.target.checked;
    await chrome.storage.local.set({ isDevelopment: e.target.checked });
    console.log('Environment changed to:', CONFIG.isDevelopment ? 'Development' : 'Production');
  });
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  showLoading(true);

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  chrome.runtime.sendMessage(
    {
      action: 'login',
      email,
      password
    },
    async (response) => {
      showLoading(false);

      if (response && response.success) {
        currentUser = response.user;
        isAuthenticated = true;
        showAuthenticatedView();
        detectRecipeOnCurrentTab();
      } else {
        showNotification(
          response?.error || 'Error al iniciar sesión',
          'error'
        );
      }
    }
  );
}

// Handle logout
function handleLogout() {
  chrome.runtime.sendMessage({ action: 'logout' }, () => {
    isAuthenticated = false;
    currentUser = null;
    showNotAuthenticatedView();
  });
}

// Detect recipe on current tab
async function detectRecipeOnCurrentTab() {
  const statusElement = document.getElementById('recipe-status');
  const importButton = document.getElementById('import-button');

  // Set detecting state
  statusElement.className = 'recipe-status detecting';
  document.getElementById('status-title').textContent = 'Buscando receta...';
  document.getElementById('status-subtitle').textContent = 'Analizando página actual';
  importButton.disabled = true;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    setRecipeStatus('not-found', 'No se pudo acceder a la pestaña', 'Intenta recargar la página');
    return;
  }

  // Send message to content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'detectRecipe' });

    if (response && response.likelyRecipe) {
      setRecipeStatus(
        'found',
        '¡Receta detectada!',
        response.metadata?.title || 'Receta encontrada en esta página'
      );
      importButton.disabled = false;
    } else {
      setRecipeStatus(
        'not-found',
        'No se detectó una receta',
        'Esta página no parece contener una receta'
      );
    }
  } catch (error) {
    console.error('Error detecting recipe:', error);
    setRecipeStatus(
      'not-found',
      'Error al analizar página',
      'Intenta recargar la extensión'
    );
  }
}

// Set recipe detection status
function setRecipeStatus(status, title, subtitle) {
  const statusElement = document.getElementById('recipe-status');
  statusElement.className = `recipe-status ${status}`;
  document.getElementById('status-title').textContent = title;
  document.getElementById('status-subtitle').textContent = subtitle;
}

// Handle import click
async function handleImportClick() {
  showLoading(true, 'Importando receta...');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    showLoading(false);
    showNotification('No se pudo acceder a la pestaña', 'error');
    return;
  }

  try {
    const recipeData = await chrome.tabs.sendMessage(tab.id, { action: 'detectRecipe' });

    chrome.runtime.sendMessage(
      {
        action: 'importRecipe',
        url: recipeData.url,
        html: recipeData.html
      },
      (response) => {
        showLoading(false);

        if (response && response.success) {
          showNotification('¡Receta importada con éxito!', 'success');

          // Update status
          setRecipeStatus(
            'found',
            '¡Receta importada!',
            'La receta se guardó en tu colección'
          );

          // Disable import button
          document.getElementById('import-button').disabled = true;
        } else {
          showNotification(
            response?.error || 'Error al importar receta',
            'error'
          );
        }
      }
    );
  } catch (error) {
    showLoading(false);
    console.error('Import error:', error);
    showNotification('Error al importar receta', 'error');
  }
}

// Show/hide loading overlay
function showLoading(show, text = 'Cargando...') {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = overlay.querySelector('.loading-text');

  if (loadingText) {
    loadingText.textContent = text;
  }

  overlay.style.display = show ? 'flex' : 'none';
}

// Show notification (inline in popup)
function showNotification(message, type = 'info') {
  // Create temporary notification element
  const notification = document.createElement('div');
  notification.className = `popup-notification popup-notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Fade in
  setTimeout(() => notification.classList.add('show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add notification styles dynamically
const style = document.createElement('style');
style.textContent = `
  .popup-notification {
    position: fixed;
    top: 70px;
    left: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    z-index: 1001;
  }
  .popup-notification.show {
    opacity: 1;
    transform: translateY(0);
  }
  .popup-notification-success {
    background: #D1FAE5;
    color: #065F46;
    border: 1px solid #10B981;
  }
  .popup-notification-error {
    background: #FEE2E2;
    color: #991B1B;
    border: 1px solid #EF4444;
  }
  .popup-notification-info {
    background: #DBEAFE;
    color: #1E40AF;
    border: 1px solid #3B82F6;
  }
`;
document.head.appendChild(style);