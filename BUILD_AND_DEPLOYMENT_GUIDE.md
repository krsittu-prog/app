╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║              🚀 APP BUILD & DEPLOYMENT GUIDE 🚀                   ║
║                                                                    ║
║                    April 14, 2026                                 ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────┐
│  📱 BUILD OPTIONS AVAILABLE                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ✅ OPTION 1: Web Build (Ready)                                   │
│  Command: npm run build                                           │
│  Output: Static web app in ./web                                  │
│  Size: ~5-10 MB                                                   │
│  Deploy to: Vercel, Netlify, AWS, etc.                           │
│                                                                    │
│  ✅ OPTION 2: Expo Go (Live Testing)                              │
│  Command: npm start                                               │
│  Then: Press 'a' for Android or 'w' for web                       │
│  Best for: Development and testing                                │
│  QR Code: Available after starting server                         │
│                                                                    │
│  ⏳ OPTION 3: APK Build (Requires Setup)                          │
│  Prerequisites:                                                   │
│  • Android SDK installed                                          │
│  • Java Development Kit (JDK) 11+                                │
│  • Android NDK (for native builds)                                │
│  Commands:                                                        │
│  1. npm install -g eas-cli                                        │
│  2. eas build --platform android --local                          │
│     (or use EAS cloud: eas build --platform android)              │
│                                                                    │
│  📦 OPTION 4: AAB (App Bundle - Google Play)                      │
│  For: Submitting to Google Play Store                             │
│  Uses: eas build --platform android --app-bundle                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  🎯 QUICK BUILD STEPS                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  BUILD 1: Web Version (Quickest - 2 minutes)                      │
│  ─────────────────────────────────────────                        │
│  $ cd d:\emerge\app\frontend                                      │
│  $ npm run build                                                  │
│  $ # Output in ./web folder - can be deployed anywhere            │
│                                                                    │
│  BUILD 2: Test in Expo Go (Recommended for testing)               │
│  ──────────────────────────────────────────────────               │
│  $ npm start                                                      │
│  $ # Scan QR code with Expo Go app                                │
│  $ # Test all features in real-time                               │
│                                                                    │
│  BUILD 3: APK for Android (Requires Java & Android SDK)           │
│  ──────────────────────────────────────────────────               │
│  $ npm install -g eas-cli                                         │
│  $ eas build --platform android --local                           │
│  $ # Output: app-release.apk (ready to install)                   │
│                                                                    │
│  BUILD 4: Production (Submit to Google Play)                      │
│  ──────────────────────────────────────────                       │
│  $ eas build --platform android --app-bundle                      │
│  $ # Output: app.aab (upload to Play Store)                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  ✅ CURRENT BUILD STATUS                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Frontend:                                                        │
│  ✅ TypeScript configured (jsx: "react-jsx")                      │
│  ✅ All dependencies installed (959 packages)                     │
│  ✅ Fixed JSX errors                                              │
│  ✅ Fixed push notifications                                      │
│  ✅ ProjectId added to app.json                                   │
│                                                                    │
│  Backend:                                                         │
│  ✅ FastAPI server running on port 8000                           │
│  ✅ Mock database initialized                                     │
│  ✅ API endpoints ready                                           │
│  ✅ CORS enabled for frontend                                     │
│                                                                    │
│  Features Implemented:                                           │
│  ✅ YouTube videos play in-app (Error 153 fixed)                 │
│  ✅ Single logo on splash screen (fixed)                          │
│  ✅ Admin test PDF viewing (NEW)                                  │
│  ✅ Admin test evaluation (NEW)                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  📋 SYSTEM REQUIREMENTS FOR APK BUILD                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  REQUIRED:                                                        │
│  ✓ Node.js 16+ (for Expo)                                         │
│  ✓ npm or yarn package manager                                    │
│                                                                    │
│  FOR LOCAL APK BUILD:                                             │
│  • Java Development Kit (JDK) 11 or higher                       │
│  • Android SDK (can use Android Studio)                           │
│  • Android NDK (recommended)                                      │
│  • ANDROID_HOME environment variable set                          │
│                                                                    │
│  FOR CLOUD BUILD (EAS):                                           │
│  • Expo CLI installed (npm install -g eas-cli)                    │
│  • Expo account (free or paid)                                    │
│  • Git repository (for cloud builds)                              │
│                                                                    │
│  Check Installation:                                             │
│  $ java -version          # Should show Java 11+                  │
│  $ node --version         # Should show 16+                       │
│  $ npm --version          # Should show 8+                        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  🔧 STEP-BY-STEP: CREATE APK WITH EAS                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Step 1: Install EAS CLI                                         │
│  $ npm install -g eas-cli                                         │
│                                                                    │
│  Step 2: Login to Expo                                            │
│  $ eas login                                                      │
│  (Create free account at https://expo.dev if needed)              │
│                                                                    │
│  Step 3: Configure EAS                                            │
│  $ cd d:\emerge\app\frontend                                      │
│  $ eas build:configure                                            │
│  (Follow prompts - select Android)                                │
│                                                                    │
│  Step 4: Build APK                                                │
│  $ eas build --platform android                                   │
│  (Cloud build - watch progress online)                            │
│                                                                    │
│  Step 5: Download APK                                             │
│  • Navigate to builds.expo.dev                                    │
│  • Find your build and download .apk                              │
│  • Install on Android device                                      │
│                                                                    │
│  OR Local Build (if Java/Android SDK installed):                 │
│  $ eas build --platform android --local                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  🌐 DEPLOY WEB VERSION                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Build Web:                                                       │
│  $ cd d:\emerge\app\frontend                                      │
│  $ npm run build                                                  │
│  $ # Creates ./web folder with static files                       │
│                                                                    │
│  Deploy to Vercel (Recommended):                                  │
│  $ npm install -g vercel                                          │
│  $ vercel                                                         │
│  $ # Follow prompts - connects to your Vercel account             │
│                                                                    │
│  Deploy to Netlify:                                               │
│  1. Build: npm run build                                          │
│  2. Drag ./web folder to https://app.netlify.com/                │
│  3. Site deployed in seconds!                                     │
│                                                                    │
│  Deploy to AWS S3:                                                │
│  $ aws s3 cp ./web s3://your-bucket --recursive                   │
│  $ # Enable CloudFront for CDN                                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  📦 BUILD OUTPUT LOCATIONS                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Web Build:                                                       │
│  Location: d:\emerge\app\frontend\web\                            │
│  Type: Static HTML/CSS/JS                                         │
│  Size: ~5-10 MB                                                   │
│                                                                    │
│  APK Build (Local):                                               │
│  Location: d:\emerge\app\frontend\android\app\build\outputs\apk   │
│  File: app-release.apk                                            │
│  Size: ~50-100 MB                                                 │
│                                                                    │
│  APK Build (EAS Cloud):                                           │
│  Download from: https://builds.expo.dev                           │
│  File: app-123456-release.apk                                     │
│  Size: ~50-100 MB                                                 │
│                                                                    │
│  AAB (Google Play):                                               │
│  Location: Same as APK (EAS Cloud)                               │
│  File: app-123456-release.aab                                     │
│  Size: ~30-50 MB                                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  🧪 TESTING OPTIONS                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Option 1: Expo Go (Mobile)                                       │
│  • Install Expo Go from Play Store/App Store                      │
│  • Run: npm start                                                 │
│  • Scan QR code                                                   │
│  • Test all features in real-time                                 │
│  Speed: 🟢 Fast                                                   │
│                                                                    │
│  Option 2: Web Browser                                            │
│  • Run: npm start                                                 │
│  • Press 'w' or open http://localhost:8081                        │
│  • Test responsive design                                         │
│  Speed: 🟢 Instant                                                │
│                                                                    │
│  Option 3: Android Emulator                                       │
│  • Install Android Studio                                         │
│  • Create virtual device                                          │
│  • Run: npm start                                                 │
│  • Press 'a' to launch                                            │
│  Speed: 🟡 Slow (needs emulator)                                  │
│                                                                    │
│  Option 4: Real Android Device                                    │
│  • Install APK on device                                          │
│  • Launch app                                                     │
│  • Test all features                                              │
│  Speed: 🟢 Fast (closest to production)                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  ⚙️ ENVIRONMENT CONFIGURATION                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Frontend (.env.local):                                           │
│  EXPO_PUBLIC_BACKEND_URL=http://localhost:8000                    │
│                                                                    │
│  For Production:                                                  │
│  EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com              │
│                                                                    │
│  Backend (.env):                                                  │
│  MONGO_URL=mongodb://localhost:27017                              │
│  DB_NAME=gs_pinnacle                                              │
│  JWT_SECRET=gs-pinnacle-secret-key-12345                          │
│                                                                    │
│  For Production:                                                  │
│  MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net            │
│  JWT_SECRET=your-strong-secret-key                                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  📝 CHECKLIST BEFORE PUBLISHING                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Code:                                                            │
│  ☐ All TypeScript errors fixed                                    │
│  ☐ No console warnings                                            │
│  ☐ Production backend URL set                                     │
│  ☐ Sensitive keys removed from code                               │
│                                                                    │
│  Testing:                                                         │
│  ☐ Login works                                                    │
│  ☐ YouTube videos play                                            │
│  ☐ Admin features work                                            │
│  ☐ No crashes on major flows                                      │
│                                                                    │
│  Performance:                                                     │
│  ☐ App starts quickly                                             │
│  ☐ No memory leaks                                                │
│  ☐ Responsive UI                                                  │
│                                                                    │
│  Metadata:                                                        │
│  ☐ App name set correctly                                         │
│  ☐ Icon and splash screen set                                     │
│  ☐ Version number updated                                         │
│  ☐ Description accurate                                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                    🎉 READY TO BUILD! 🎉                         ║
║                                                                    ║
║              Choose your build option above                       ║
║          and follow the step-by-step instructions                 ║
║                                                                    ║
║             Questions? Check the docs or run:                     ║
║           npm start  (to test in Expo Go first)                   ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
