# 🧪 QUICK TEST REFERENCE - April 14, 2026

## Server Status: ✅ RUNNING

```
Terminal Output:
✅ Metro Bundler: Started
✅ Expo Go: Ready
✅ QR Code: Available
✅ Port 8081: Active
```

---

## 📱 START TESTING NOW

### 3 Ways to Test:

**Option 1: Mobile Device**
```
1. Install Expo Go (Android/iOS)
2. Scan QR code from terminal
3. Tap notification → App opens
```

**Option 2: Web Browser**
```
1. Press 'w' in terminal
2. Opens http://localhost:8081
```

**Option 3: Android Emulator**
```
1. Press 'a' in terminal
2. Launches emulator automatically
```

---

## 🎯 PRIORITY TEST CASES

### MUST TEST ✅ CRITICAL

1. **Splash Screen**
   - Launch app
   - **Expected**: Single logo (no duplication)

2. **YouTube Videos** ⭐ MAIN FIX
   - Go to any course
   - Click YouTube video
   - **Expected**: Plays INSIDE app (not redirected)

3. **Admin Test PDFs** ⭐ NEW FEATURE
   - Login as admin
   - Go to Tests tab
   - Click "View PDF"
   - **Expected**: PDF displays in modal

4. **Test Evaluation** ⭐ NEW FEATURE
   - Admin: Click "Evaluate"
   - Enter score: 85
   - Click Submit
   - **Expected**: Submission marked evaluated

### SHOULD TEST ✅ IMPORTANT

- [ ] Student uploads test PDF
- [ ] Video playback (uploaded videos)
- [ ] Live chat during video
- [ ] Speed controls work
- [ ] Profile page loads
- [ ] Logout works

### CAN TEST ✅ NICE TO HAVE

- [ ] Course materials (PDFs)
- [ ] Course enrollment
- [ ] Payment integration
- [ ] Support tickets
- [ ] Search functionality

---

## ⚡ QUICK BUG CHECK

| Issue | Check | Expected |
|-------|-------|----------|
| Duplicate logo | App startup | Single logo ✓ |
| YouTube error 153 | Play YouTube video | Plays in-app ✓ |
| Can't view PDF | Admin → Tests → View PDF | PDF visible ✓ |
| Can't evaluate | Admin → Tests → Evaluate | Score saved ✓ |

---

## 🚨 IF SOMETHING BREAKS

**Press 'r' to reload** (hottest)  
**Close app, reopen** (soft restart)  
**Ctrl+C and restart server** (hard restart)

```bash
cd d:\emerge\app\frontend
npm start -- --clear
```

---

## 📋 TESTING SUMMARY

**Total Features to Test**: 20+  
**Critical Features**: 4  
**New Features**: 3  
**Recent Fixes**: 3  

**Estimated Time**: 30-45 minutes  
**Difficulty**: Easy (UI testing)

---

## ✅ SUCCESS CRITERIA

App is READY when:
- ✅ No crashes
- ✅ YouTube plays in-app
- ✅ PDFs viewable
- ✅ Evaluations work
- ✅ No console errors

---

## 📞 HELPFUL COMMANDS

```
r       = Reload app
j       = Open debugger
m       = Menu
a       = Android
w       = Web
?       = Show all
Ctrl+C  = Exit
```

---

## 🎉 HAPPY TESTING!

**Time Started**: Now ⏱️  
**Status**: 🟢 READY  
**Good Luck!** 🚀
