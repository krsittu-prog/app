# GS Pinnacle IAS - Full-Stack Application

A comprehensive learning management system built with **Expo (React Native)** frontend and **FastAPI** backend for IAS exam preparation.

![Status](https://img.shields.io/badge/status-development-blue)
![Platform](https://img.shields.io/badge/platform-ios%20--%20android%20--%20web-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## 📱 Overview

GS Pinnacle IAS is a complete learning platform offering:
- 📚 Course browsing and management
- 🎥 YouTube video integration with in-app playback
- 📝 Test creation and submission
- ✅ Student progress tracking
- 💳 Payment integration (Razorpay)
- 📧 Email notifications
- 👥 Multi-role system (Admin, Student)

## 🚀 Tech Stack

### Frontend
- **Framework**: Expo with React Native
- **Routing**: Expo Router
- **State Management**: React Context API
- **UI**: React Native components
- **Type**: TypeScript
- **Platform**: iOS, Android, Web

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (mock in-memory for development)
- **Authentication**: JWT
- **Real-time**: WebSocket for chat
- **Email**: SMTP
- **Payments**: Razorpay integration
- **SMS**: MSG91 integration

## 📋 Prerequisites

- Node.js 16+ & npm
- Python 3.9+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI for building (`npm install -g eas-cli`)
- MongoDB (optional - app uses mock DB for dev)

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/gs-pinnacle-ias.git
cd gs-pinnacle-ias
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python server.py
```

Backend runs on: `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Press:
- `w` for web (http://localhost:8081)
- `a` for Android
- `i` for iOS

## 📁 Project Structure

```
gs-pinnacle-ias/
├── frontend/                 # Expo React Native app
│   ├── app/                 # Expo Router app directory
│   │   ├── (auth)/          # Auth screens
│   │   ├── (tabs)/          # Tab navigation screens
│   │   ├── (admin)/         # Admin dashboard
│   │   ├── course/          # Course detail screens
│   │   └── player.tsx       # Video player
│   ├── src/
│   │   ├── api.ts           # API client
│   │   ├── context/         # React Context
│   │   └── theme.ts         # Theme configuration
│   └── package.json
│
├── backend/                  # FastAPI server
│   ├── server.py            # Main application
│   ├── requirements.txt      # Python dependencies
│   ├── tests/               # Test files
│   └── uploads/             # User uploads (videos, PDFs)
│
├── memory/                  # Project documentation
├── test_reports/            # Test results
└── README.md
```

## 🔑 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=gs_pinnacle
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
MSG91_AUTH_KEY=your-key
MSG91_SENDER_ID=GSPIN
EMAIL_ADDRESS=your-email
EMAIL_APP_PASSWORD=your-password
```

### Frontend (.env.local)
```
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.14:8000
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend - Manual Testing
1. Open app on web/mobile
2. Login with test credentials: `admin@gspinnacle.com` / `admin123`
3. Test features:
   - Browse courses
   - View videos
   - Take tests
   - Check admin dashboard

## 📦 Building APK

```bash
cd frontend
npm install -g eas-cli
eas login
eas build --platform android
```

Download APK from https://builds.expo.dev

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)
```bash
# Push to cloud platform
git push heroku main
```

### Frontend Deployment
- Publish to Expo: `eas submit --platform android`
- Or submit APK to Google Play Store

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Course Endpoints
- `GET /api/courses` - Get all courses
- `GET /api/courses/{id}` - Get course details
- `POST /api/courses` - Create course (admin)

### Test Endpoints
- `GET /api/tests` - Get all tests
- `POST /api/tests/{id}/submit` - Submit test

### Full API docs available at: `http://localhost:8000/docs`

## 🔐 Security Notes

⚠️ **Current Development Setup:**
- Uses mock in-memory database (data lost on restart)
- CORS allows all origins (for development)
- No rate limiting on API endpoints
- JWT uses development secret

✅ **For Production:**
- Use real MongoDB/PostgreSQL
- Configure CORS properly
- Add rate limiting
- Use strong JWT secret
- Enable HTTPS/SSL
- Add security headers

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 📧 Support

For issues and questions:
- GitHub Issues: [Report Issue](https://github.com/yourusername/gs-pinnacle-ias/issues)
- Email: support@gspinnacle.com

## 🙏 Acknowledgments

- Expo framework for cross-platform development
- FastAPI for modern Python APIs
- MongoDB for document database
- Razorpay for payment processing

---

**Status**: 🟡 Development Ready | Production setup in progress

Last Updated: April 15, 2026
