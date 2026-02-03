@echo off
REM Supabase Restore Script for Windows
REM This script restores your Supabase database backup

echo ========================================
echo Supabase Database Restore Script
echo ========================================
echo.

REM Configuration
set TARGET_PROJECT_REF=your-target-project-ref
set TARGET_DB_PASSWORD=your-target-db-password
set BACKUP_FILE=%1

if "%BACKUP_FILE%"=="" (
    echo ERROR: No backup file specified!
    echo Usage: restore-supabase.bat path\to\backup.sql
    echo.
    echo Available backups:
    dir /b backups\*.sql 2>nul
    pause
    exit /b 1
)

if not exist "%BACKUP_FILE%" (
    echo ERROR: Backup file not found: %BACKUP_FILE%
    pause
    exit /b 1
)

echo WARNING: This will OVERWRITE the target database!
echo Target Project: %TARGET_PROJECT_REF%
echo Backup File: %BACKUP_FILE%
echo.
set /p CONFIRM="Are you sure you want to continue? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Restore cancelled.
    pause
    exit /b 0
)

echo.
echo Step 1: Checking PostgreSQL tools...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL tools not found!
    echo Please install PostgreSQL or add it to your PATH
    pause
    exit /b 1
)

echo.
echo Step 2: Starting restore process...
echo.

REM Construct the database connection string
set DB_URL=postgresql://postgres:%TARGET_DB_PASSWORD%@db.%TARGET_PROJECT_REF%.supabase.co:5432/postgres

REM Perform the restore
echo Restoring database (this may take a few minutes)...
psql "%DB_URL%" < "%BACKUP_FILE%"

if errorlevel 1 (
    echo ERROR: Restore failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Restore completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Update your environment variables with new Supabase credentials
echo 2. Test your application thoroughly
echo 3. Verify all data has been migrated correctly
pause
