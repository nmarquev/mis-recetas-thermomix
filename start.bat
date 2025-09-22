@echo off
echo =============================================
echo 🚀 Starting Thermo Recipe Genius
echo =============================================

echo.
echo 📦 Installing dependencies if needed...

:: Install frontend dependencies
echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

:: Generate Prisma client
echo 🔧 Generating Prisma client...
call npm run db:generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)

:: Push database schema
echo 📊 Setting up database...
call npm run db:push
if %errorlevel% neq 0 (
    echo ⚠️  Database setup failed, but continuing...
)

:: Seed database with demo data
echo 🌱 Adding demo users and recipes...
call npm run db:seed
if %errorlevel% neq 0 (
    echo ⚠️  Database seeding failed, but continuing...
)

cd ..

echo.
echo 🌟 Starting services...
echo.
echo 🔗 Frontend will be available at: http://localhost:8080
echo 🔗 Backend API will be available at: http://localhost:3002
echo.
echo Press Ctrl+C in any window to stop both services
echo =============================================

:: Start backend in new window
start "Thermo Recipe Backend (Port 3002)" cmd /k "cd backend && npm run dev"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "Thermo Recipe Frontend (Port 8080)" cmd /k "npm run dev"

echo.
echo ✅ Both services are starting...
echo 🖥️  Frontend: http://localhost:8080
echo 🔧 Backend: http://localhost:3002
echo.
echo Close this window or press any key to continue...
pause >nul