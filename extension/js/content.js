// Content script injected into all web pages
// Detects recipes and provides UI for importing

let importButton = null;
let isAuthenticated = false;

// Initialize on page load
initialize();

function initialize() {
  console.log('TasteBox content script loaded');

  // Check authentication status
  chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
    if (response && response.isAuthenticated) {
      isAuthenticated = true;
      detectRecipeAndShowButton();
    }
  });

  // Listen for recipe detection requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectRecipe') {
      const recipeData = detectRecipe();
      sendResponse(recipeData);
    }
  });
}

// Detect if current page contains a recipe
function detectRecipe() {
  const url = window.location.href;
  const html = document.documentElement.outerHTML;

  // Check for recipe indicators in the page
  const hasRecipeSchema = !!document.querySelector('[itemtype*="Recipe"]');
  const hasRecipeJSON = !!document.querySelector('script[type="application/ld+json"]');
  const hasRecipeKeywords = document.body.innerText.toLowerCase().includes('ingredient') ||
                           document.body.innerText.toLowerCase().includes('instructions') ||
                           document.body.innerText.toLowerCase().includes('preparation');

  const likelyRecipe = hasRecipeSchema || hasRecipeJSON || hasRecipeKeywords;

  // Try to extract basic info
  let title = document.title;
  let image = null;

  // Try to find recipe title
  const h1 = document.querySelector('h1');
  if (h1) title = h1.textContent.trim();

  // Try to find main recipe image
  const recipeImage = document.querySelector('[itemprop="image"]') ||
                     document.querySelector('meta[property="og:image"]') ||
                     document.querySelector('.recipe-image img') ||
                     document.querySelector('article img');

  if (recipeImage) {
    image = recipeImage.src || recipeImage.content;
  }

  return {
    url,
    html,
    likelyRecipe,
    metadata: {
      title,
      image,
      hasSchema: hasRecipeSchema,
      hasJSON: hasRecipeJSON
    }
  };
}

// Show floating import button if recipe detected
function detectRecipeAndShowButton() {
  const recipeData = detectRecipe();

  if (recipeData.likelyRecipe && !importButton) {
    createImportButton();
  }
}

// Create floating import button
function createImportButton() {
  if (importButton) return;

  importButton = document.createElement('div');
  importButton.id = 'tastebox-import-button';
  importButton.innerHTML = `
    <div class="tastebox-fab">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="tastebox-tooltip">Import to TasteBox</span>
    </div>
  `;

  importButton.addEventListener('click', handleImportClick);
  document.body.appendChild(importButton);
}

// Handle import button click
async function handleImportClick() {
  if (!isAuthenticated) {
    showNotification('Please log in to TasteBox first', 'error');
    // Open popup
    chrome.runtime.sendMessage({ action: 'openPopup' });
    return;
  }

  // Show loading state
  importButton.classList.add('loading');
  showNotification('Importing recipe...', 'info');

  const recipeData = detectRecipe();

  // Send import request to background script
  chrome.runtime.sendMessage({
    action: 'importRecipe',
    url: recipeData.url,
    html: recipeData.html
  }, (response) => {
    importButton.classList.remove('loading');

    if (response && response.success) {
      showNotification('Recipe imported successfully!', 'success');

      // Optionally remove button after successful import
      setTimeout(() => {
        if (importButton) {
          importButton.remove();
          importButton = null;
        }
      }, 3000);
    } else {
      showNotification(
        response?.error || 'Failed to import recipe',
        'error'
      );
    }
  });
}

// Show notification to user
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `tastebox-notification tastebox-notification-${type}`;
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

// Clean up on navigation
window.addEventListener('beforeunload', () => {
  if (importButton) {
    importButton.remove();
    importButton = null;
  }
});