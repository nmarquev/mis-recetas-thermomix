javascript:(function(){
    'use strict';

    console.log('🔖 TasteBox Smart Bookmarklet v2.0');

    // Prevent multiple instances
    if (window.tasteboxBookmarkletRunning) {
        console.log('⚠️ Bookmarklet already running');
        return;
    }
    window.tasteboxBookmarkletRunning = true;

    // Smart server detection
    function detectTasteboxServer() {
        const possibleServers = [
            `https://${window.location.hostname}:3006`, // Same IP as current page, HTTPS first
            `http://${window.location.hostname}:3006`, // Same IP as current page, HTTP fallback
            'https://localhost:3006',
            'http://localhost:3006',
            'https://127.0.0.1:3006',
            'http://127.0.0.1:3006',
            'https://tastebox.local:3006', // Your custom domain
            'http://tastebox.local:3006',
            'https://192.168.0.10:3006', // Common development IP
            'http://192.168.0.10:3006',
        ];
        return possibleServers;
    }

    // Check if user is authenticated with TasteBox
    async function checkAuthentication(serverUrl) {
        try {
            const response = await fetch(`${serverUrl}/api/auth/me`, {
                credentials: 'include',
                mode: 'cors'
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('✅ User authenticated:', userData.user?.name);
                return { authenticated: true, serverUrl, user: userData.user };
            }
        } catch (error) {
            console.log(`❌ Server ${serverUrl} not reachable:`, error.message);
        }
        return { authenticated: false, serverUrl };
    }

    // Find active TasteBox server and check auth
    async function findActiveServer() {
        const servers = detectTasteboxServer();
        console.log('🔍 Checking servers:', servers);

        for (const serverUrl of servers) {
            const result = await checkAuthentication(serverUrl);
            if (result.authenticated) {
                return result;
            }
        }

        // Try first available server for login
        for (const serverUrl of servers) {
            try {
                const response = await fetch(`${serverUrl}/api/health`, {
                    method: 'GET',
                    mode: 'cors'
                });
                if (response.ok) {
                    console.log('📡 Found active server:', serverUrl);
                    return { authenticated: false, serverUrl };
                }
            } catch (error) {
                continue;
            }
        }

        throw new Error('No TasteBox server found. Make sure the app is running.');
    }

    // Create overlay UI
    function createOverlay() {
        // Remove existing overlay
        const existing = document.getElementById('tastebox-overlay');
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = 'tastebox-styles';
        style.textContent = `
            #tastebox-overlay {
                position: fixed !important;
                top: 0 !important; left: 0 !important;
                width: 100% !important; height: 100% !important;
                background: rgba(0,0,0,0.8) !important;
                z-index: 999999 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                font-family: system-ui, sans-serif !important;
            }
            #tastebox-modal {
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
            #tastebox-close {
                position: absolute !important;
                top: 12px !important; right: 16px !important;
                background: none !important; border: none !important;
                font-size: 24px !important; cursor: pointer !important;
                color: #666 !important; padding: 4px 8px !important;
            }
            .tastebox-title {
                color: #2c3e50 !important;
                margin: 0 0 16px 0 !important;
                font-size: 20px !important;
                font-weight: 600 !important;
            }
            .tastebox-status {
                padding: 12px !important; border-radius: 6px !important;
                margin: 16px 0 !important; font-weight: 500 !important;
            }
            .status-loading {
                background: #e3f2fd !important; color: #1976d2 !important;
                border: 1px solid #bbdefb !important;
            }
            .status-success {
                background: #e8f5e8 !important; color: #2e7d32 !important;
                border: 1px solid #a5d6a7 !important;
            }
            .status-error {
                background: #ffebee !important; color: #c62828 !important;
                border: 1px solid #ffcdd2 !important;
            }
            .status-warning {
                background: #fff3e0 !important; color: #f57c00 !important;
                border: 1px solid #ffcc02 !important;
            }
            .tastebox-buttons {
                display: flex !important; gap: 12px !important;
                margin-top: 20px !important; flex-wrap: wrap !important;
            }
            .tb-btn {
                padding: 10px 20px !important; border: none !important;
                border-radius: 6px !important; cursor: pointer !important;
                font-weight: 500 !important; font-size: 14px !important;
                text-decoration: none !important; text-align: center !important;
            }
            .tb-btn-primary {
                background: #4CAF50 !important; color: white !important;
            }
            .tb-btn-secondary {
                background: #f5f5f5 !important; color: #666 !important;
                border: 1px solid #ddd !important;
            }
            .tb-btn-login {
                background: #2196F3 !important; color: white !important;
            }
        `;

        document.head.appendChild(style);

        const overlay = document.createElement('div');
        overlay.id = 'tastebox-overlay';
        overlay.innerHTML = `
            <div id="tastebox-modal">
                <button id="tastebox-close">×</button>
                <h2 class="tastebox-title">🍳 TasteBox Recipe Importer</h2>
                <div id="tastebox-content">
                    <div class="tastebox-status status-loading">
                        🔄 Connecting to TasteBox...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        document.getElementById('tastebox-close').onclick = closeOverlay;
        overlay.onclick = (e) => {
            if (e.target === overlay) closeOverlay();
        };

        return overlay;
    }

    // Update content
    function updateContent(html) {
        const content = document.getElementById('tastebox-content');
        if (content) content.innerHTML = html;
    }

    // Close overlay
    function closeOverlay() {
        const overlay = document.getElementById('tastebox-overlay');
        if (overlay) overlay.remove();
        window.tasteboxBookmarkletRunning = false;
    }

    // Show login required
    function showLoginRequired(serverUrl) {
        const html = `
            <div class="tastebox-status status-warning">
                🔐 Login required to import recipes
            </div>
            <p style="color: #666; font-size: 14px; margin: 16px 0;">
                You need to be logged in to TasteBox to import recipes. Click the button below to login.
            </p>
            <div class="tastebox-buttons">
                <button class="tb-btn tb-btn-login" onclick="window.open('${serverUrl}', '_blank', 'width=800,height=600'); setTimeout(() => { document.getElementById('tastebox-overlay').remove(); window.tasteboxBookmarkletRunning = false; }, 1000);">
                    Login to TasteBox
                </button>
                <button class="tb-btn tb-btn-secondary" onclick="document.getElementById('tastebox-overlay').remove(); window.tasteboxBookmarkletRunning = false;">
                    Cancel
                </button>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 16px;">
                💡 After logging in, try the bookmarklet again
            </p>
        `;
        updateContent(html);
    }

    // Show success
    function showSuccess(recipe, serverUrl) {
        const html = `
            <div class="tastebox-status status-success">
                ✅ Recipe imported successfully!
            </div>
            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 16px 0; background: #f9f9f9;">
                <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 18px;">${recipe.title}</h3>
                <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Ingredients:</strong> ${recipe.ingredients.length} items</p>
                <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Instructions:</strong> ${recipe.instructions.length} steps</p>
                <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Prep Time:</strong> ${recipe.prepTime} minutes</p>
                <p style="margin: 4px 0; color: #666; font-size: 14px;"><strong>Servings:</strong> ${recipe.servings}</p>
            </div>
            <div class="tastebox-buttons">
                <button class="tb-btn tb-btn-primary" onclick="window.open('${serverUrl}', '_blank')">
                    Open TasteBox
                </button>
                <button class="tb-btn tb-btn-secondary" onclick="document.getElementById('tastebox-overlay').remove(); window.tasteboxBookmarkletRunning = false;">
                    Close
                </button>
            </div>
        `;
        updateContent(html);
    }

    // Show error
    function showError(message) {
        const html = `
            <div class="tastebox-status status-error">
                ❌ ${message}
            </div>
            <div class="tastebox-buttons">
                <button class="tb-btn tb-btn-secondary" onclick="document.getElementById('tastebox-overlay').remove(); window.tasteboxBookmarkletRunning = false;">
                    Close
                </button>
            </div>
        `;
        updateContent(html);
    }

    // Import recipe
    async function importRecipe(serverUrl) {
        try {
            updateContent(`
                <div class="tastebox-status status-loading">
                    🔄 Analyzing page for recipes...
                </div>
            `);

            const html = document.documentElement.outerHTML;
            const url = window.location.href;
            const title = document.title;

            console.log('📊 Sending recipe data to TasteBox...');

            const response = await fetch(`${serverUrl}/api/import-html`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ html, url, title })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Recipe imported successfully');
                showSuccess(data.recipe, serverUrl);
            } else {
                console.error('❌ Import failed:', data);
                showError(data.error || 'Failed to extract recipe from this page');
            }

        } catch (error) {
            console.error('❌ Import error:', error);
            showError('Could not connect to TasteBox. Make sure the app is running.');
        }
    }

    // Main execution
    async function main() {
        const overlay = createOverlay();

        try {
            // Find server and check authentication
            const serverInfo = await findActiveServer();

            if (serverInfo.authenticated) {
                console.log('✅ User is authenticated, proceeding with import');
                await importRecipe(serverInfo.serverUrl);
            } else {
                console.log('🔐 User not authenticated, showing login');
                showLoginRequired(serverInfo.serverUrl);
            }

        } catch (error) {
            console.error('❌ Main error:', error);
            showError(error.message);
        }
    }

    // Start the process
    main();

})();