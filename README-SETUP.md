# Thermo Recipe Genius - Setup Guide

## Quick Start

### Option 1: Double-click the startup script
- **Windows Batch**: Double-click `start.bat`
- **PowerShell**: Right-click `start.ps1` → "Run with PowerShell"

### Option 2: Using npm
```bash
npm run start
```

### Option 3: Manual startup
```bash
# Start backend (in one terminal)
cd backend
npm install
npm run db:generate
npm run db:push
npm run dev

# Start frontend (in another terminal)
npm install
npm run dev
```

## Services

- **Frontend**: http://localhost:8080 (React + Vite)
- **Backend**: http://localhost:3002 (Express.js + Prisma)

## Demo Users

The startup script automatically creates demo users for testing:

- **Email**: `demo@thermomix.com`
  **Password**: `demo123`

- **Email**: `chef@cocina.com`
  **Password**: `demo123`

Both users come with sample recipes to get you started!

## What the startup script does

1. ✅ Installs dependencies for both frontend and backend
2. ✅ Generates Prisma client
3. ✅ Sets up the database schema
4. ✅ Starts backend server on port 3002
5. ✅ Starts frontend development server on port 8080
6. ✅ Opens both services in separate terminal windows

## Stopping the services

- Press `Ctrl+C` in each terminal window, or
- Close the terminal windows

## Troubleshooting

### Port conflicts
- Frontend runs on port 8080 (configured in `vite.config.ts`)
- Backend runs on port 3002 (configured in `backend/.env`)

### Database issues
- The script automatically runs `npm run db:push` to set up the database
- If you have issues, manually run: `cd backend && npm run db:generate && npm run db:push`

### Dependencies
- If you get dependency errors, run `npm install` in both root and `backend` directories

## Project Structure

```
thermo-recipe-genius/
├── src/                    # Frontend source code (React + TypeScript)
├── backend/               # Backend source code (Express.js + Prisma)
├── start.bat             # Windows batch startup script
├── start.ps1             # PowerShell startup script
└── package.json          # Frontend dependencies and scripts
```