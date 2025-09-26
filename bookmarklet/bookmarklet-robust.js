javascript:(function(){
    'use strict';

    console.log('🔖 Recipe Genius Bookmarklet started');

    // Configuration
    const API_BASE = 'http://localhost:3003';
    const API_ENDPOINT = API_BASE + '/api/import-html';

    // Check if we're already running
    if (window.recipeGeniusRunning) {
        console.log('⚠️ Bookmarklet already running');
        return;
    }
    window.recipeGeniusRunning = true;

    // Function to safely get auth token
    function getAuthToken() {
        try {
            const token = localStorage.getItem('authToken') ||
                         localStorage.getItem('token') ||
                         localStorage.getItem('jwt') ||
                         localStorage.getItem('auth_token');

            if (!token) {
                throw new Error('Authentication token not found. Please login to Recipe Genius first.');
            }

            console.log('✅ Auth token found');
            return token;
        } catch (error) {
            console.error('❌ Auth token error:', error);
            throw error;
        }
    }

    // Function to create overlay safely
    function createOverlay() {
        try {
            // Remove any existing overlay
            const existing = document.getElementById('recipe-genius-overlay');
            if (existing) {
                existing.remove();
            }

            // Create styles
            const style = document.createElement('style');
            style.id = 'recipe-genius-styles';
            style.textContent = `
                #recipe-genius-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: rgba(0,0,0,0.8) !important;
                    z-index: 999999 !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                }
                #recipe-genius-modal {
                    background: white !important;
                    border-radius: 12px !important;
                    padding: 24px !important;
                    max-width: 500px !important;
                    width: 90% !important;
                    max-height: 80vh !important;
                    overflow-y: auto !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
                    position: relative !important;
                }
                #recipe-genius-close {
                    position: absolute !important;
                    top: 12px !important;
                    right: 16px !important;
                    background: none !important;
                    border: none !important;
                    font-size: 24px !important;
                    cursor: pointer !important;
                    color: #666 !important;
                    padding: 4px 8px !important;
                }
                .recipe-genius-title {
                    color: #2c3e50 !important;
                    margin: 0 0 16px 0 !important;
                    font-size: 20px !important;
                    font-weight: 600 !important;
                }
                .recipe-genius-status {
                    padding: 12px !important;
                    border-radius: 6px !important;
                    margin: 16px 0 !important;
                    font-weight: 500 !important;
                }
                .status-loading {
                    background: #e3f2fd !important;
                    color: #1976d2 !important;
                    border: 1px solid #bbdefb !important;
                }
                .status-success {
                    background: #e8f5e8 !important;
                    color: #2e7d32 !important;
                    border: 1px solid #a5d6a7 !important;
                }
                .status-error {
                    background: #ffebee !important;
                    color: #c62828 !important;
                    border: 1px solid #ffcdd2 !important;
                }
                .recipe-genius-buttons {
                    display: flex !important;
                    gap: 12px !important;
                    margin-top: 20px !important;
                }
                .rg-btn {
                    padding: 10px 20px !important;
                    border: none !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-weight: 500 !important;
                    font-size: 14px !important;
                    text-decoration: none !important;
                }
                .rg-btn-primary {
                    background: #4CAF50 !important;
                    color: white !important;
                }
                .rg-btn-secondary {
                    background: #f5f5f5 !important;
                    color: #666 !important;
                    border: 1px solid #ddd !important;
                }
            `;

            document.head.appendChild(style);

            // Create overlay
            const overlay = document.createElement('div');
            overlay.id = 'recipe-genius-overlay';
            overlay.innerHTML = `
                <div id="recipe-genius-modal">
                    <button id="recipe-genius-close">×</button>
                    <h2 class="recipe-genius-title">🍳 Thermomix Recipe Genius</h2>
                    <div id="recipe-genius-content">
                        <div class="recipe-genius-status status-loading">
                            🔄 Analyzing page for recipes...
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Add event listeners
            document.getElementById('recipe-genius-close').onclick = function() {
                overlay.remove();
                window.recipeGeniusRunning = false;
            };

            overlay.onclick = function(e) {
                if (e.target === overlay) {
                    overlay.remove();
                    window.recipeGeniusRunning = false;
                }
            };

            console.log('✅ Overlay created successfully');
            return overlay;

        } catch (error) {
            console.error('❌ Error creating overlay:', error);
            throw error;
        }
    }

    // Function to update content
    function updateContent(html) {
        try {
            const content = document.getElementById('recipe-genius-content');
            if (content) {
                content.innerHTML = html;
            }
        } catch (error) {
            console.error('❌ Error updating content:', error);
        }
    }

    // Function to show success
    function showSuccess(data) {
        try {
            const recipe = data.recipe;
            const html = `
                <div class="recipe-genius-status status-success">
                    ✅ Recipe extracted successfully!
                </div>
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 16px 0; background: #f9f9f9;">
                    <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 18px;">${recipe.title}</h3>
                    <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Ingredients:</strong> ${recipe.ingredients.length} items</p>
                    <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Instructions:</strong> ${recipe.instructions.length} steps</p>
                    <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Prep Time:</strong> ${recipe.prepTime} minutes</p>
                    <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Servings:</strong> ${recipe.servings}</p>
                </div>
                <div class="recipe-genius-buttons">
                    <button class="rg-btn rg-btn-primary" onclick="window.open('http://localhost:8080', '_blank')">Open Recipe Genius</button>
                    <button class="rg-btn rg-btn-secondary" onclick="document.getElementById('recipe-genius-overlay').remove(); window.recipeGeniusRunning = false;">Close</button>
                </div>
            `;
            updateContent(html);
            console.log('✅ Success displayed');
        } catch (error) {
            console.error('❌ Error showing success:', error);
        }
    }

    // Function to show error
    function showError(message) {
        try {
            const html = `
                <div class="recipe-genius-status status-error">
                    ❌ ${message}
                </div>
                <div class="recipe-genius-buttons">
                    <button class="rg-btn rg-btn-secondary" onclick="document.getElementById('recipe-genius-overlay').remove(); window.recipeGeniusRunning = false;">Close</button>
                </div>
            `;
            updateContent(html);
            console.error('❌ Error displayed:', message);
        } catch (error) {
            console.error('❌ Error showing error:', error);
        }
    }

    // Main extraction function
    async function extractRecipe() {
        try {
            console.log('🚀 Starting recipe extraction');

            // Create overlay
            const overlay = createOverlay();

            // Get auth token
            let authToken;
            try {
                authToken = getAuthToken();
            } catch (error) {
                showError(error.message);
                return;
            }

            // Get page content
            const html = document.documentElement.outerHTML;
            const url = window.location.href;
            const title = document.title;

            console.log('📊 Sending data to API:', {
                url: url,
                title: title,
                htmlLength: html.length
            });

            // Send to API
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    html: html,
                    url: url,
                    title: title
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Recipe extracted successfully:', data);
                showSuccess(data);
            } else {
                console.error('❌ API Error:', data);
                showError(data.error || 'Failed to extract recipe from this page');
            }

        } catch (error) {
            console.error('❌ Network/Fetch Error:', error);
            showError('Could not connect to Recipe Genius app. Make sure it is running on localhost:3003');
        }
    }

    // Start the extraction
    extractRecipe();

})();