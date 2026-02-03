@echo off
REM Supabase Backup Script for Windows
REM This script backs up your Supabase database

echo ========================================
echo Supabase Database Backup Script
echo ========================================
echo.

REM Configuration
set SOURCE_PROJECT_REF=your-source-project-ref
set SOURCE_DB_PASSWORD=your-source-db-password
set BACKUP_DIR=backups
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Step 1: Checking Supabase CLI installation...
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Supabase CLI is not installed!
    echo Please install it first: npm install -g supabase
    pause
    exit /b 1
)

echo Step 2: Checking pg_dump installation...
pg_dump --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL tools not found!
    echo Please install PostgreSQL or add it to your PATH
    pause
    exit /b 1
)

echo.
echo Step 3: Starting backup process...
echo Backup will be saved to: %BACKUP_DIR%\backup_%TIMESTAMP%.sql
echo.

REM Construct the database connection string
set DB_URL=postgresql://postgres:%SOURCE_DB_PASSWORD%@db.%SOURCE_PROJECT_REF%.supabase.co:5432/postgres

REM Perform the backup
echo Backing up database (this may take a few minutes)...
pg_dump "%DB_URL%" ^
    --clean ^
    --if-exists ^
    --quote-all-identifiers ^
    --no-owner ^
    --no-privileges ^
    --file="%BACKUP_DIR%\backup_%TIMESTAMP%.sql"

if errorlevel 1 (
    echo ERROR: Backup failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Backup completed successfully!
echo File: %BACKUP_DIR%\backup_%TIMESTAMP%.sql
echo ========================================
echo.
echo You can now use restore-supabase.bat to restore to another project
pause
