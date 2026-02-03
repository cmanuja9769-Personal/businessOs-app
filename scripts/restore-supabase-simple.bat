@echo off
REM Simple Supabase Restore Script (No Supabase CLI required)
REM Uses only PostgreSQL tools (psql)

echo ========================================
echo Supabase Database Restore Script
echo (PostgreSQL Tools Only - No CLI needed)
echo ========================================
echo.

REM ===== CONFIGURATION - EDIT THESE VALUES =====
set TARGET_PROJECT_REF=rfolqjrbnbiiknstlyqe
set TARGET_DB_PASSWORD=Ae6b8aa9@9769
REM =============================================

set BACKUP_FILE=%1

if "%BACKUP_FILE%"=="" (
    echo ERROR: No backup file specified!
    echo.
    echo Usage: restore-supabase-simple.bat path\to\backup.sql
    echo.
    echo Example: restore-supabase-simple.bat backups\backup_20260204_120000.sql
    echo.
    echo Available backups:
    if exist backups\*.sql (
        dir /b backups\*.sql
    ) else (
        echo   No backups found in backups\ folder
    )
    echo.
    pause
    exit /b 1
)

if not exist "%BACKUP_FILE%" (
    echo ERROR: Backup file not found: %BACKUP_FILE%
    echo.
    echo Please check the file path and try again.
    pause
    exit /b 1
)

if "%TARGET_PROJECT_REF%"=="your-target-project-ref" (
    echo ERROR: Please edit this script and set your configuration!
    echo.
    echo Edit these lines:
    echo   set TARGET_PROJECT_REF=your-target-project-ref
    echo   set TARGET_DB_PASSWORD=your-target-db-password
    echo.
    pause
    exit /b 1
)

echo Checking PostgreSQL tools installation...
psql --version >nul 2^>^&1
if errorlevel 1 (
    echo ERROR: PostgreSQL tools ^(psql^) not found!
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
echo ========================================
echo WARNING: This will OVERWRITE the target database!
echo ========================================
echo.
echo   Target Project: %TARGET_PROJECT_REF%
echo   Backup File:    %BACKUP_FILE%
echo.
set /p CONFIRM="Type 'YES' to continue: "
if /i not "%CONFIRM%"=="YES" (
    echo.
    echo Restore cancelled.
    pause
    exit /b 0
)

echo.
echo Starting restore process...
echo This may take a few minutes depending on database size...
echo.

REM Set connection string
set PGPASSWORD=%TARGET_DB_PASSWORD%
set DB_HOST=db.%TARGET_PROJECT_REF%.supabase.co
set DB_PORT=5432
set DB_NAME=postgres
set DB_USER=postgres

REM Perform the restore
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% < "%BACKUP_FILE%"

if errorlevel 1 (
    echo.
    echo ERROR: Restore encountered some errors!
    echo.
    echo This might be normal if:
    echo - Some system tables couldn't be restored (can be ignored)
    echo - Extensions already exist
    echo.
    echo Check above for specific errors.
    echo If data was restored successfully, you can proceed.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Restore completed!
echo ========================================
echo.
echo Important next steps:
echo.
echo 1. UPDATE ENVIRONMENT VARIABLES
echo    Update .env or .env.local with new credentials:
echo    NEXT_PUBLIC_SUPABASE_URL=https://%TARGET_PROJECT_REF%.supabase.co
echo    NEXT_PUBLIC_SUPABASE_ANON_KEY=[get from new project settings]
echo.
echo 2. VERIFY DATA
echo    - Check table row counts
echo    - Test application functionality
echo    - Verify RLS policies are working
echo.
echo 3. MIGRATE STORAGE (if needed)
echo    - Storage files are NOT included in database backup
echo    - Use Supabase dashboard or CLI to migrate files
echo.
echo 4. CONFIGURE AUTH
echo    - Set up auth providers in new project
echo    - Update email templates
echo    - Configure redirect URLs
echo.
pause
