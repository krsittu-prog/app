# PowerShell script to convert AAB to APK
# Usage: .\convert-aab-to-apk.ps1 -AabFile "path/to/your.aab"

param(
    [string]$AabFile = $null
)

# Colors for console output
function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args[0] -ForegroundColor Red }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }

Write-Info "====================================="
Write-Info "AAB to APK Converter"
Write-Info "====================================="

# Step 1: Check if AAB file provided
if (-not $AabFile) {
    Write-Info "Available AAB files in current directory:"
    $aabs = Get-ChildItem -Filter "*.aab" -ErrorAction SilentlyContinue
    
    if ($aabs.Count -eq 0) {
        Write-Error-Custom "❌ No AAB file found!"
        Write-Info "Please provide AAB file:"
        Write-Info "  Usage: .\convert-aab-to-apk.ps1 -AabFile 'path/to/file.aab'"
        Write-Info ""
        Write-Info "Or download from: https://builds.expo.dev"
        exit 1
    }
    
    if ($aabs.Count -eq 1) {
        $AabFile = $aabs[0].FullName
        Write-Success "✓ Using: $AabFile"
    } else {
        Write-Info "Found multiple AAB files:"
        for ($i = 0; $i -lt $aabs.Count; $i++) {
            Write-Info "  [$($i+1)] $($aabs[$i].Name)"
        }
        $selection = Read-Host "Select file number"
        $AabFile = $aabs[$selection - 1].FullName
    }
}

# Verify AAB exists
if (-not (Test-Path $AabFile)) {
    Write-Error-Custom "❌ AAB file not found: $AabFile"
    exit 1
}

Write-Success "✓ Found AAB: $AabFile"

# Step 2: Check Java installation
Write-Info "`nChecking Java installation..."
try {
    $javaVersion = java -version 2>&1
    Write-Success "✓ Java is installed"
    Write-Info $javaVersion[0]
} catch {
    Write-Error-Custom "❌ Java not found! Please install Java 8 or higher"
    Write-Info "Download from: https://www.oracle.com/java/technologies/downloads/"
    exit 1
}

# Step 3: Download bundletool if needed
Write-Info "`nChecking bundletool..."
$bundletoolPath = "bundletool.jar"

if (-not (Test-Path $bundletoolPath)) {
    Write-Info "Downloading bundletool..."
    try {
        $url = "https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all.jar"
        Invoke-WebRequest -Uri $url -OutFile $bundletoolPath -UseBasicParsing
        Write-Success "✓ Bundletool downloaded"
    } catch {
        Write-Error-Custom "❌ Failed to download bundletool"
        Write-Info "Download manually from: https://github.com/google/bundletool/releases"
        exit 1
    }
} else {
    Write-Success "✓ Bundletool found"
}

# Step 4: Generate APK from AAB
$aabName = (Get-Item $AabFile).BaseName
$apksFile = "$aabName.apks"
$apkFile = "$aabName-universal.apk"

Write-Info "`nConverting AAB to APK..."
Write-Info "  Input: $AabFile"
Write-Info "  Output: $apkFile"

try {
    java -jar $bundletoolPath build-apks `
        --bundle=$AabFile `
        --output=$apksFile `
        --mode=universal
    
    Write-Success "✓ Generated APKs bundle"
} catch {
    Write-Error-Custom "❌ Failed to generate APKs"
    Write-Info "Error: $_"
    exit 1
}

# Step 5: Extract universal APK
Write-Info "`nExtracting universal APK..."
try {
    if (Test-Path "extracted") {
        Remove-Item "extracted" -Recurse -Force
    }
    Expand-Archive $apksFile -DestinationPath "extracted"
    Copy-Item "extracted/universal.apk" $apkFile -Force
    Write-Success "✓ Extracted APK"
} catch {
    Write-Error-Custom "❌ Failed to extract APK"
    Write-Info "Error: $_"
    exit 1
}

# Step 6: Cleanup
Write-Info "`nCleaning up..."
Remove-Item $apksFile -Force
Remove-Item "extracted" -Recurse -Force

# Success!
Write-Success "`n====================================="
Write-Success "✅ Conversion Complete!"
Write-Success "====================================="
Write-Info "`nYour APK is ready: $apkFile"
Write-Info "`nFile size: $((Get-Item $apkFile).Length / 1MB | [math]::Round(2)) MB"
Write-Info ""
Write-Info "Next steps:"
Write-Info "  1. Transfer to Android device"
Write-Info "  2. Tap to install"
Write-Info "  3. Allow installation from unknown sources if needed"
Write-Info ""
Write-Info "To install via ADB:"
Write-Info "  adb install $apkFile"
