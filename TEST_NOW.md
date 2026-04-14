# 🧪 Testing - Quick Start Guide

## ✅ Server Already Running!

The Expo development server is **ACTIVE** right now!

```
✅ Metro Bundler: Running
✅ Expo Go: Ready
✅ QR Code: Available in terminal
✅ Web: http://localhost:8081
```

---

## 📱 TEST THE APP NOW

### Option 1: Mobile Device (Best)

**Android:**
1. Download "Expo Go" from Google Play Store
2. Scan QR code shown in terminal
3. App opens automatically

**iOS:**
1. Open Camera app
2. Scan QR code shown in terminal
3. Tap "Open in Expo Go" notification
4. App opens

### Option 2: Web Browser

**In terminal, press: `w`**

Or visit: http://localhost:8081

### Option 3: Android Emulator

**In terminal, press: `a`**

---

## 🎯 CRITICAL TESTS

### Test 1: Splash Screen
```
1. Launch app
2. Watch startup
3. ✅ Expected: Single logo (not doubled)
4. ✅ Shlokas animate at bottom
5. ✅ Smooth transition to login
```

### Test 2: YouTube Videos ⭐ MAIN FIX
```
1. Login with student account
2. Go to Courses tab
3. Click any course
4. Find a YouTube video link
5. Tap it
6. ✅ Expected: Video plays INSIDE app
7. ✅ NOT redirected to YouTube
8. ✅ No Error 153
9. ✅ Fullscreen works
10. ✅ Speed controls work (0.5x - 2.5x)
```

### Test 3: Admin Test PDF Viewing ⭐ NEW
```
1. Logout (if logged in)
2. Login with ADMIN account
3. Go to "Tests" tab (NEW!)
4. Click on a test
5. Expand to see submissions
6. Click "View PDF"
7. ✅ Expected: PDF shows in modal
8. ✅ Can scroll through pages
9. ✅ Close button works
```

### Test 4: Admin Test Evaluation ⭐ NEW
```
1. Still in Tests tab as admin
2. Click "Evaluate" button
3. Enter score: 85
4. Enter feedback: "Great work!"
5. Click "Submit Evaluation"
6. ✅ Expected: Status changes to "Evaluated"
7. ✅ Score displays: 85
8. ✅ Student receives notification
9. ✅ Can see feedback
```

---

## 📊 ADDITIONAL TESTS

### Test 5: Student Upload Test PDF
```
1. Login as STUDENT
2. Go to "Tests" tab
3. Click "Upload PDF" button
4. Select PDF from device
5. Upload starts
6. ✅ Expected: Success message
7. ✅ Submission shows as "Pending"
8. ✅ Can see in "My Results"
```

### Test 6: Video Playback
```
1. Click on any uploaded video
2. Video plays
3. ✅ No buffering
4. ✅ No lag
5. ✅ Sound works
6. ✅ Can seek
```

### Test 7: Live Chat
```
1. Open video on 2 devices
2. Send chat message from device 1
3. ✅ Expected: Message appears on device 2
4. ✅ Delivery < 1 second
5. ✅ Online count updates
```

---

## 🚨 IF SOMETHING GOES WRONG

### App won't load?
**Press `r` in terminal** (reload)

### Want to restart server?
```powershell
Ctrl+C  (in terminal)
Set-Location "d:\emerge\app\frontend"
npm start
```

### Want fresh start?
```powershell
Ctrl+C
cd d:\emerge\app\frontend
npm start -- --clear
```

---

## 🔧 TERMINAL COMMANDS

While app is running:

| Key | Action |
|-----|--------|
| `r` | Reload app |
| `j` | Open debugger |
| `m` | Show menu |
| `a` | Android emulator |
| `w` | Web browser |
| `o` | Open code editor |
| `?` | Show all commands |
| `Ctrl+C` | Stop server |

---

## 📋 SIMPLE CHECKLIST

Print this and check off as you go:

```
SPLASH SCREEN
☐ Single logo (not doubled)
☐ Shlokas animate
☐ Transitions to login

YOUTUBE VIDEOS
☐ Plays inside app
☐ No Error 153
☐ Fullscreen works
☐ Speed controls work

ADMIN TESTS (NEW)
☐ Tests tab visible
☐ Can see submissions
☐ Can view PDF
☐ Can evaluate & score

GENERAL
☐ No crashes
☐ No console errors
☐ No lag
☐ Performance good

STATUS: ☐ READY TO DEPLOY
```

---

## 📞 QUICK TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| App won't load | Press `r` |
| Video won't play | Check internet |
| PDF not showing | Refresh page |
| Chat not working | Check connection |
| Console errors | Press `j` to debug |

---

## ✅ SUCCESS = ALL THIS WORKS

- ✅ Splash screen clean (single logo)
- ✅ YouTube videos play in-app
- ✅ Admin can view student PDFs
- ✅ Admin can evaluate tests
- ✅ No crashes
- ✅ No console errors

**If all ✅, app is READY!** 🚀

---

## 🎉 HAPPY TESTING!

**Go ahead and test the app now!**

Questions? Check the detailed guides:
- `APP_TESTING_GUIDE.md` - Full testing guide
- `QUICK_TEST_REFERENCE.md` - Quick reference
- `TESTING_READY.md` - Full overview

**Let's make sure everything works!** 🧪
