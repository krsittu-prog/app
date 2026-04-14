# EAS Submit - Quick Reference

## 📱 One-Line Submission

```bash
cd d:\emerge\app\frontend
eas submit --platform android
```

## 🔧 Common Commands

### Submit to Google Play Store
```bash
eas submit --platform android
```

### Submit to Apple App Store
```bash
eas submit --platform ios
```

### Submit Both Platforms
```bash
eas submit --platform all
```

### Submit Specific Build
```bash
eas submit --platform android --id <build-id>
```

### Non-Interactive Mode
```bash
eas submit --platform android --non-interactive
```

### With Environment Override
```bash
eas submit --platform android -e production
```

## ✅ Prerequisites

Before running `eas submit`:

1. **Build Must Exist**
   ```bash
   eas build --platform android
   ```
   Wait for build to complete on https://builds.expo.dev

2. **Google Play Account**
   - Developer account: https://play.google.com/console
   - $25 registration fee

3. **App Listing Created**
   - Create app in Play Console
   - Fill app information
   - Add store listing

4. **Service Account** (for Android)
   - Create in Google Cloud Console
   - Generate JSON key
   - Upload to Google Play Console

## 📝 What `eas submit` Does

1. **Finds your latest build**
   - Looks for most recent successful build
   - Shows options to select different build

2. **Creates submission**
   - Prepares AAB/APK for submission
   - Handles signing if needed

3. **Submits to store**
   - Sends to Google Play Console/App Store
   - Creates release/version

4. **Confirms**
   - Shows submission details
   - Provides download link

## ❓ Common Questions

### How long does submission take?
- Upload: 5-15 minutes
- Initial processing: 30 minutes - 2 hours
- Review: 24-48 hours or more

### How do I check submission status?
- Go to: https://play.google.com/console
- Release → Production
- Check status there

### Can I cancel submission?
- Yes, from Play Console
- Go to "Releases in review"
- Click "Stop rollout"

### What if submission fails?
- Check error message
- Fix issues
- Re-run `eas submit`

### Do I need to submit every build?
- No, only when ready for release
- Internal testing builds: don't submit
- Production builds: submit only when ready

## 🚀 Step-by-Step

### 1. Build the App
```bash
cd d:\emerge\app\frontend
eas build --platform android
# Wait for completion
```

### 2. Prepare Play Console
- Create app listing
- Add screenshots
- Write description
- Set privacy policy

### 3. Submit
```bash
eas submit --platform android
```

### 4. Answer Prompts
```
? Which build would you like to submit?
› Select your build

? What track do you want to release to?
› production (recommended for first release)

? Create Google Play Service Account?
› Yes (setup credentials)
```

### 5. Wait for Approval
- Monitor Play Console
- Check email for updates
- App appears after approval

## 📊 Submission Tracks

| Track | Audience | Purpose |
|-------|----------|---------|
| **internal** | TestFlight (iOS) / Internal (Android) | Internal testing |
| **alpha** | Closed testing | Private beta |
| **beta** | Open testing | Public beta |
| **production** | All users | Recommended for launches |

## 🔐 Credentials Management

### Store Service Account

```bash
# EAS will ask for credentials first time
# Follow prompts to:
# 1. Create Google Cloud project
# 2. Create service account
# 3. Generate JSON key
# 4. Grant permissions in Play Console
# 5. Upload JSON from Play Console

# After first submission, credentials are saved in:
# ~/.expo/credentials.json (encrypted)
```

### View Saved Credentials

```bash
eas credentials
```

### Update Credentials

```bash
eas credentials --platform android
```

## ⚠️ Important Notes

### Before First Submission
- Test app thoroughly
- Ensure backend is working
- Check all features
- Verify no hardcoded test data

### During Play Store Review
- Don't make changes
- Don't submit multiple times
- Check email regularly
- Respond to any questions

### Common Rejection Reasons
1. **Broken functionality** - App crashes or doesn't work
2. **Policy violation** - Violates Play Store policies
3. **Incomplete listing** - Missing screenshots or description
4. **Privacy concerns** - No privacy policy
5. **Spam/spam-like** - Misleading description

### Avoid These Mistakes
❌ Don't hardcode API keys in app  
❌ Don't use test credentials in production  
❌ Don't submit without testing  
❌ Don't plagiarize descriptions  
❌ Don't use fake screenshots  

## 📈 After Submission

Once approved:

1. **Monitor on day 1**
   ```bash
   # View in Play Console
   # Check for crashes
   # Monitor user reviews
   ```

2. **Respond to users**
   - Reply to reviews
   - Fix reported bugs
   - Push updates

3. **Plan updates**
   - Gather feedback
   - Plan features
   - Schedule releases

## 🆘 Troubleshooting

### "Build not found"
```bash
# Rebuild
eas build --platform android
# Wait for completion
```

### "Invalid credentials"
```bash
# Reset credentials
eas credentials --platform android
# Re-enter Play Store credentials
```

### "App rejected"
- Check rejection reason in Play Console
- Fix issues
- Resubmit:
  ```bash
  eas submit --platform android
  ```

### "Timeout during upload"
- Check internet connection
- Try again:
  ```bash
  eas submit --platform android
  ```

## 📚 More Resources

- **Full Docs**: https://docs.expo.dev/submit/submit-ios/
- **Play Console**: https://play.google.com/console
- **EAS CLI**: https://docs.expo.dev/reference/eas-cli/

---

**Ready to submit?** 🚀

```bash
eas submit --platform android
```

Happy publishing! 🎉
