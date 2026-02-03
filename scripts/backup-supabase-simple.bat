@echo off
REM Simple Supabase Backup Script (No Supabase CLI required)
REM Uses only PostgreSQL tools (pg_dump)

echo ========================================
echo Supabase Database Backup Script
echo (PostgreSQL Tools Only - No CLI needed)
echo ========================================
echo.

REM ===== CONFIGURATION - EDIT THESE VALUES =====
set SOURCE_PROJECT_REF=usuvuphejjeuxhgpavip
set SOURCE_DB_PASSWORD=Ae6b8aa9@9769
REM =============================================

set BACKUP_DIR=backups
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Checking PostgreSQL tools installation...
pg_dump --version >nul 2^>^&1
if errorlevel 1 (
    echo ERROR: PostgreSQL tools ^(pg_dump^) not found!
    echo.
    echo Please install PostgreSQL from:
    echo https://www.postgresql.org/download/windows/
    echo.
    echo Make sure to:
    echo 1. Install "Command Line Tools" during setup
    echo 2. Add PostgreSQL bin folder to your PATH
    echo    Usually: C:\Program Files\PostgreSQL\16\bin
    echo.
    pause
    exit /b 1
)

echo.
echo Configuration:
echo   Project: %SOURCE_PROJECT_REF%
echo   Output:  %BACKUP_DIR%\backup_%TIMESTAMP%.sql
echo.

if "%SOURCE_PROJECT_REF%"=="your-source-project-ref" (
    echo ERROR: Please edit this script and set your configuration!
    echo.
    echo Edit these lines:
    echo   set SOURCE_PROJECT_REF=your-source-project-ref
    echo   set SOURCE_DB_PASSWORD=your-source-db-password
    echo.
    pause
    exit /b 1
)

echo Starting backup process...
echo This may take a few minutes depending on database size...
echo.

REM Set connection string
set PGPASSWORD=%SOURCE_DB_PASSWORD%
set DB_HOST=db.%SOURCE_PROJECT_REF%.supabase.co
set DB_PORT=5432
set DB_NAME=postgres
set DB_USER=postgres

REM Perform the backup
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% ^
    --clean ^
    --if-exists ^
    --quote-all-identifiers ^
    --no-owner ^
    --no-privileges ^
    --file="%BACKUP_DIR%\backup_%TIMESTAMP%.sql"

if errorlevel 1 (
    echo.
    echo ERROR: Backup failed!
    echo.
    echo Common issues:
    echo 1. Wrong password or project reference
    echo 2. Network connectivity issues
    echo 3. IP not whitelisted in Supabase project settings
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Backup completed successfully!
echo ========================================
echo.
echo File saved to: %BACKUP_DIR%\backup_%TIMESTAMP%.sql
echo File size:
dir "%BACKUP_DIR%\backup_%TIMESTAMP%.sql" | find "backup_"
echo.
echo Next steps:
echo 1. Verify the backup file was created
echo 2. Use restore-supabase-simple.bat to restore to another project
echo.
pause
