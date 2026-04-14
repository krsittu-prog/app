# 📦 AAB to APK Conversion - Complete Guide

Your app has been built as an **AAB (Android App Bundle)**. This guide shows you how to convert it to an **APK** for installation.

## 🎯 Quick Start (Choose Your Method)

### Method 1: Automated PowerShell Script (Windows) ⭐ RECOMMENDED

**Easiest for Windows users:**

```powershell
cd d:\emerge\app
.\convert-aab-to-apk.ps1
```

The script will:
- ✅ Find your AAB file automatically
- ✅ Download bundletool
- ✅ Convert AAB → APK  
- ✅ Save `gs-pinnacle-ias-universal.apk`

---

### Method 2: Batch File Script (Windows)

**For older Windows or command prompt:**

```cmd
cd d:\emerge\app
convert-aab-to-apk.bat gs-pinnacle-ias.aab
```

Same as PowerShell but in batch format.

---

### Method 3: Manual Command Line

**Full control:**

```powershell
# 1. Download bundletool
Invoke-WebRequest -Uri "https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all.jar" -OutFile bundletool.jar

# 2. Convert AAB to APKS (bundle)
java -jar bundletool.jar build-apks `
  --bundle=gs-pinnacle-ias.aab `
  --output=gs-pinnacle-ias.apks `
  --mode=universal

# 3. Extract universal APK
Expand-Archive gs-pinnacle-ias.apks -DestinationPath extracted/
Copy-Item extracted/universal.apk gs-pinnacle-ias-universal.apk
```

---

### Method 4: Online Web Tool (No Installation)

**Zero setup required:**

1. Open `aab-to-apk-converter.html` in your browser
2. Upload AAB file
3. Click "Convert"
4. Download APK

---

### Method 5: Online Service (Easiest)

**Most user-friendly:**

1. Go to: https://www.bundletool.online/
2. Upload your `.aab` file
3. Download universal APK
4. Done!

---

## 📥 Step 1: Get Your AAB File

### From EAS Build (Recommended)

1. Visit: **https://builds.expo.dev**
2. Log in with your Expo account
3. Find your latest Android build
4. Click **Download** button
5. Save AAB file to: `d:\emerge\app\`

### File Size Reference
- Typical AAB: 50-150 MB
- Required disk space: ~500 MB free

---

## 🔧 Step 2: Convert AAB to APK

### Using Automated Script (Recommended)

```powershell
cd d:\emerge\app
.\convert-aab-to-apk.ps1 -AabFile "path/to/your-app.aab"
```

**What happens:**
- Checks if Java is installed
- Downloads bundletool (~80 MB)
- Converts your AAB
- Extracts universal APK
- Cleans up temporary files
- Displays success message

**Result:** `gs-pinnacle-ias-universal.apk` (~50-80 MB)

---

## 📱 Step 3: Install on Android

### Option A: USB Cable + ADB (Fastest)

**Prerequisites:**
- Android device connected via USB
- USB debugging enabled on device
- ADB installed (`adb` command available)

```powershell
# List connected devices
adb devices

# Install APK
adb install gs-pinnacle-ias-universal.apk

# Or reinstall (replacing old version)
adb install -r gs-pinnacle-ias-universal.apk
```

**Expected output:**
```
List of attached devices
ABC123 device

Success
```

---

### Option B: Direct Installation (Easiest)

1. Transfer APK to Android device (USB cable, email, cloud storage)
2. Open file manager on device
3. Find `gs-pinnacle-ias-universal.apk`
4. Tap to install
5. If prompted: "Settings → Unknown sources" → Enable
6. Tap Install
7. Open app when done

---

### Option C: Share APK File

**For testing with others:**

```powershell
# Share via email
# Attach gs-pinnacle-ias-universal.apk to email

# Or upload to cloud storage
# Google Drive, Dropbox, OneDrive, etc.
# Share download link with testers
```

Users tap the link and install directly from browser.

---

### Option D: Play Store (Production)

The AAB file itself is what you submit to Google Play Store:

1. Go to **Google Play Console** → https://play.google.com/console
2. Create app listing
3. Upload your `.aab` file (not APK)
4. Google Play Store handles APK generation automatically

---

## ✅ Verification Checklist

After conversion, verify:

- [ ] APK file exists: `gs-pinnacle-ias-universal.apk`
- [ ] File size: ~50-150 MB (reasonable size)
- [ ] Can install on Android device
- [ ] App launches without crashing
- [ ] Can login with: `admin@gspinnacle.com` / `admin123`
- [ ] Features work (view courses, videos, etc.)

---

## 🆘 Troubleshooting

### "Java not found"
```powershell
# Install Java 8+
# https://www.oracle.com/java/technologies/downloads/
java -version
```

### "bundletool.jar not found"
```powershell
# Download manually
wget https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all.jar
```

### "adb: command not found"
```powershell
# Install Android SDK Platform Tools
# https://developer.android.com/studio/releases/platform-tools

# Or add to PATH:
# C:\Program Files\Android\platform-tools\
```

### "No connected devices"
```powershell
# Check connection
adb devices

# If device shows "offline":
# 1. Disconnect USB cable
# 2. Enable USB debugging on device
# 3. Reconnect USB cable
# 4. Accept debug dialog on device
```

### "Installation failed. Can't parse the file"
- APK file is corrupted - try converting again
- Android version too old (requires 8.0+)
- Try installing via file manager instead

### "App crashes after installation"
- Backend URL not configured properly
- Network connection issue
- Check logs: `adb logcat`

---

## 📊 File Sizes

| Item | Size |
|------|------|
| Bundletool | ~80 MB |
| AAB File | 50-150 MB |
| Universal APK | 50-120 MB |
| Extracted APKS | 100-200 MB |
| **Total temp space** | **~500 MB** |

---

## 🎓 Understanding AAB vs APK

| Feature | AAB | APK |
|---------|-----|-----|
| Installation | Google Play only | Any Android phone |
| File size | Smaller | Larger |
| Compression | Better | Standard |
| Distribution | App stores | Direct/sideload |
| Updates | Automatic | Manual |

For production: Use **AAB** (submit to Play Store)  
For testing: Use **APK** (install directly)

---

## 🚀 What's Next?

1. **Test on real device** - Install APK and verify all features
2. **Get feedback** - Share with beta testers
3. **Submit to Play Store** - Use original AAB file for production
4. **Monitor analytics** - Track installs and crashes

---

## 📞 Support

**Need help?**
- Check script output for specific errors
- Review logs: `adb logcat | grep gs-pinnacle`
- Check GitHub issues: https://github.com/krsittu-prog/gs-pinnacle-ias/issues
- Review troubleshooting section above

---

## 📝 Script Files Available

| File | Purpose | Platform |
|------|---------|----------|
| `convert-aab-to-apk.ps1` | PowerShell automation | Windows (Recommended) |
| `convert-aab-to-apk.bat` | Batch file automation | Windows CMD |
| `aab-to-apk-converter.html` | Web interface | Any browser |
| `AAB_TO_APK_GUIDE.md` | This guide | Reference |

---

**Ready to convert?** 🚀

```powershell
# Download AAB from https://builds.expo.dev
# Then run:
.\convert-aab-to-apk.ps1

# Start installing!
```

Good luck! 🎉
