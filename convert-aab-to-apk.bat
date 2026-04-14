@echo off
REM Batch script to convert AAB to APK
REM Usage: convert-aab-to-apk.bat [path-to-aab-file]

setlocal enabledelayedexpansion

echo =====================================
echo AAB to APK Converter
echo =====================================
echo.

REM Check if AAB file provided as argument
if "%~1"=="" (
    echo No AAB file specified. Searching for AAB files...
    for %%f in (*.aab) do (
        if not defined AABFILE set "AABFILE=%%f"
    )
    
    if not defined AABFILE (
        echo ERROR: No AAB file found!
        echo Usage: convert-aab-to-apk.bat [path-to-aab-file]
        echo.
        echo Download your AAB from: https://builds.expo.dev
        pause
        exit /b 1
    )
) else (
    set "AABFILE=%~1"
)

if not exist "!AABFILE!" (
    echo ERROR: AAB file not found: !AABFILE!
    pause
    exit /b 1
)

echo [OK] Found AAB: !AABFILE!
echo.

REM Check Java installation
echo Checking Java installation...
java -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java not found! Please install Java 8 or higher
    echo Download from: https://www.oracle.com/java/technologies/downloads/
    pause
    exit /b 1
)
echo [OK] Java is installed
echo.

REM Download bundletool if needed
echo Checking bundletool...
if not exist "bundletool.jar" (
    echo Downloading bundletool...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all.jar' -OutFile 'bundletool.jar'" >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Failed to download bundletool
        echo Download manually from: https://github.com/google/bundletool/releases
        pause
        exit /b 1
    )
    echo [OK] Bundletool downloaded
) else (
    echo [OK] Bundletool found
)
echo.

REM Extract filename without extension
for %%F in ("!AABFILE!") do set "BASENAME=%%~nF"
set "APKSFILE=!BASENAME!.apks"
set "APKFILE=!BASENAME!-universal.apk"

echo Converting AAB to APK...
echo Input:  !AABFILE!
echo Output: !APKFILE!
echo.

REM Generate APKs from AAB
java -jar bundletool.jar build-apks --bundle="!AABFILE!" --output="!APKSFILE!" --mode=universal
if errorlevel 1 (
    echo ERROR: Failed to generate APKs
    pause
    exit /b 1
)
echo [OK] Generated APKs bundle
echo.

REM Extract universal APK
echo Extracting universal APK...
if exist "extracted" rmdir /s /q "extracted"
powershell -Command "Expand-Archive -Path '!APKSFILE!' -DestinationPath 'extracted'"
if errorlevel 1 (
    echo ERROR: Failed to extract APK
    pause
    exit /b 1
)

copy "extracted\universal.apk" "!APKFILE!" >nul
echo [OK] Extracted APK
echo.

REM Cleanup
echo Cleaning up...
del "!APKSFILE!"
rmdir /s /q "extracted"

REM Success
echo.
echo =====================================
echo SUCCESS! Conversion Complete
echo =====================================
echo.
echo Your APK is ready: !APKFILE!
echo.
echo Next steps:
echo   1. Transfer APK to Android device
echo   2. Tap file to install
echo   3. Allow "Installation from unknown sources" if prompted
echo.
echo To install via ADB:
echo   adb install !APKFILE!
echo.
pause
