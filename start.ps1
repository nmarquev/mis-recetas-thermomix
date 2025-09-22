Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Thermo Recipe Genius" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Installing dependencies if needed..." -ForegroundColor Yellow
Write-Host ""

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Frontend npm install failed" }
} catch {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Blue
try {
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Backend npm install failed" }
} catch {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
try {
    npm run db:generate
    if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed" }
} catch {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Push database schema
Write-Host "📊 Setting up database..." -ForegroundColor Blue
try {
    npm run db:push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Database setup failed, but continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Database setup failed, but continuing..." -ForegroundColor Yellow
}

# Seed database with demo data
Write-Host "🌱 Adding demo users and recipes..." -ForegroundColor Blue
try {
    npm run db:seed
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Database seeding failed, but continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Database seeding failed, but continuing..." -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "🌟 Starting services..." -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Frontend will be available at: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔗 Backend API will be available at: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in any window to stop both services" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan

# Start backend in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Both services are starting..." -ForegroundColor Green
Write-Host "🖥️  Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Close this window or press any key to continue..." -ForegroundColor Yellow
Read-Host