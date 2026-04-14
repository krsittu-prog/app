# How to Convert AAB to APK

Your app was successfully built as an AAB (Android App Bundle). Here's how to convert it to an APK for installation.

## 📥 Step 1: Download Your AAB File

1. Go to: **https://builds.expo.dev**
2. Find your latest Android build
3. Click **Download** to get the `.aab` file
4. Save it to: `d:\emerge\app\build\` folder

## 🔧 Method 1: Using Online Tool (Fastest)

1. Go to: https://www.bundletool.online/
2. Upload your `.aab` file
3. It will give you universal `.apk` file
4. Download and install

## 🔧 Method 2: Using Bundletool (Recommended)

### Prerequisites
- Java 8+ installed
- Your AAB file downloaded

### Steps

```powershell
# 1. Download bundletool
cd d:\emerge\app\build
Invoke-WebRequest -Uri "https://github.com/google/bundletool/releases/latest/download/bundletool-all.jar" -OutFile "bundletool.jar"

# 2. Generate universal APK from AAB
# (Replace with your AAB filename)
java -jar bundletool.jar build-apks `
  --bundle=gs-pinnacle-ias.aab `
  --output=gs-pinnacle-ias.apks `
  --mode=universal

# 3. Extract APK from APKS
Expand-Archive gs-pinnacle-ias.apks -DestinationPath extracted/
Copy-Item extracted/universal.apk gs-pinnacle-ias-universal.apk

# 4. Install on device
adb install gs-pinnacle-ias-universal.apk
```

## 🔧 Method 3: Using EAS CLI

```bash
cd d:\emerge\app\frontend

# Build directly as APK (not AAB)
eas build --platform android --distribution internal
```

This creates an APK directly instead of AAB.

## 📱 Installation

### Option A: USB Cable (Recommended)
```powershell
# Check if device connected
adb devices

# Install APK
adb install path/to/your-app.apk

# Or drag & drop onto device
```

### Option B: QR Code / Email
1. Upload APK to cloud storage
2. Share link via email/QR code
3. Download directly on Android device
4. Tap to install

### Option C: Play Store (Production)
AAB is specifically for Google Play Store submission, which handles conversion automatically.

## ❓ Troubleshooting

**"bundletool.jar not found"**
- Make sure java is installed: `java -version`
- Download bundletool again

**"adb is not recognized"**
- Install Android SDK: https://developer.android.com/studio
- Add to PATH: `C:\Program Files\Android\platform-tools\adb.exe`

**"No connected devices"**
- Enable USB debugging on Android device
- Allow USB debugging when prompted
- Run: `adb devices`

**APK won't install**
- Check Android version (app requires 8.0+)
- Allow app installation from unknown sources
- Try uninstalling old version first

## 🎯 Quick Start (5 Minutes)

1. **Download AAB** from https://builds.expo.dev
2. Upload to https://www.bundletool.online/
3. Download resulting APK
4. Email/share with Android users
5. They tap to install

---

Need help? Check GITHUB_README.md for deployment options!
