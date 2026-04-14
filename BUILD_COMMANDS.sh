#!/bin/bash
# GS PINNACLE IAS - BUILD COMMANDS
# Run these commands to build the app in different formats

# ==================== WEB BUILD ====================
# Build web version (static files)
echo "Building web version..."
cd d:\emerge\app\frontend
npm run build
echo "✅ Web build complete! Output in ./web folder"
echo ""

# ==================== EXPO GO TEST ====================
# Test in development (Expo Go)
echo "To test in development:"
echo "$ npm start"
echo "Then press 'a' for Android or 'w' for web"
echo ""

# ==================== APK BUILD (LOCAL) ====================
# Requires: Java, Android SDK, Android NDK
echo "For local APK build:"
echo "$ npm install -g eas-cli"
echo "$ eas build --platform android --local"
echo ""

# ==================== APK BUILD (CLOUD) ====================
# Uses EAS Cloud - recommended for most users
echo "For cloud APK build (recommended):"
echo "1. npm install -g eas-cli"
echo "2. eas login (or create free Expo account)"
echo "3. eas build --platform android"
echo "4. Download from https://builds.expo.dev"
echo ""

# ==================== APP BUNDLE (GOOGLE PLAY) ====================
# For Google Play Store submission
echo "For Google Play Store (AAB format):"
echo "$ eas build --platform android --app-bundle"
echo ""

# ==================== QUICK START ====================
echo "QUICK START:"
echo "1. Start backend: cd backend && python server.py"
echo "2. Start frontend: cd frontend && npm start"
echo "3. Test in Expo Go or web browser"
echo "4. When ready to build: follow commands above"
