# Changelog

All notable changes to GS Pinnacle IAS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-15

### Added
- Initial release of GS Pinnacle IAS
- ✅ User authentication (login/register)
- ✅ Course browsing and management
- ✅ YouTube video integration with in-app playback
- ✅ Test creation and submission
- ✅ Student progress tracking
- ✅ Admin dashboard
- ✅ Multi-role system (Admin, Student)
- ✅ Email notifications
- ✅ WebSocket chat integration
- ✅ Razorpay payment integration
- ✅ Push notifications (Expo Notifications)
- ✅ File upload support (videos, PDFs)
- ✅ Dynamic course content management
- ✅ Test PDF download for admins
- ✅ Mobile app (iOS/Android) via Expo
- ✅ Web app support
- ✅ TypeScript frontend
- ✅ FastAPI backend
- ✅ JWT authentication
- ✅ Responsive design

### Fixed
- ✅ YouTube video playback error (Issue #153)
- ✅ Network authentication failed errors
- ✅ Splash screen icon missing error
- ✅ Notifications handling on web
- ✅ Admin PDF access permissions

### Documentation
- Added comprehensive README
- Added API documentation
- Added development setup guide
- Added contribution guidelines
- Added deployed builds guide

## [0.9.0] - 2026-04-14

### Added (Beta)
- Core backend infrastructure with FastAPI
- Expo frontend setup
- Basic authentication flow
- Course model and API
- Test model and API
- Mock database setup

### Known Issues
- In-memory database (data lost on restart)
- No production database configured
- CORS allows all origins (for development)
- No rate limiting on API endpoints

## Future Versions

### [1.1.0] - Planned
- [ ] Real MongoDB integration
- [ ] Production deployment setup
- [ ] Enhanced security features
- [ ] Rate limiting
- [ ] Advanced analytics
- [ ] Offline mode
- [ ] Social features (discussion forums)
- [ ] Certificate generation

### [1.2.0] - Planned
- [ ] Advanced search and filters
- [ ] Custom test creation UI
- [ ] Level-based courses
- [ ] Video transcripts
- [ ] Batch user management
- [ ] Advanced reporting

### [2.0.0] - Future
- [ ] AI-powered recommendations
- [ ] Live classes
- [ ] Mobile app store publishing
- [ ] Multi-language support
- [ ] Offline content sync
- [ ] Advanced gamification

---

## How to Report Issues

If you find a bug or want to request a feature, please [open an issue](../../issues) on GitHub.

## How to Contribute

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

**Last Updated:** April 15, 2026
