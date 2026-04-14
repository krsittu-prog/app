# GS Pinnacle IAS - EdTech Platform PRD

## Overview
A comprehensive EdTech platform for GS Pinnacle IAS institute, similar to Physics Wallah. Supports student learning, course management, test evaluation, and admin operations.

## Tech Stack
- **Frontend**: React Native + Expo (SDK 54) with expo-router
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT + bcrypt (email/password with dual OTP verification)
- **SMS OTP**: MSG91
- **Email**: Gmail SMTP
- **Payment**: Razorpay (live keys integrated)
- **AI Chatbot**: OpenAI GPT-4o-mini via Emergent LLM
- **Database**: MongoDB

## User Roles
1. **Admin** (God Mode): Full CMS, course management, student data, analytics, support tickets
2. **Teacher**: Test evaluation, assigned batch management
3. **Student**: Course browsing, enrollment, test portal, support

## Features Implemented

### Authentication & Onboarding
- Animated splash screen with GS Pinnacle logo + 3 random Sanskrit shlokas
- Multi-step registration: Name/Password → Email/Phone → Target Courses → Phone OTP → Email OTP
- JWT-based login with role-based routing
- Admin seeded: krsittu@gmail.com / Indra@4

### Student Interface
- Dynamic home page with greeting, banner (CMS-controlled), quick actions
- Course browsing with filters (Live/Recorded/Free) and search
- Course detail page with features, videos, enrollment
- Test portal with available tests and submission results
- Profile with purchases, AI chatbot, grievance tickets, logout

### Admin Dashboard
- Analytics: Students, Courses, Revenue, Enrollments, Open Tickets, Pending Evaluations
- Full CMS: Edit hero title, subtitle, description, banner, contact info
- Student Registration List with verification status
- Course Management: Create, edit, delete courses (title, description, type, category, price, instructor, features)
- Support Ticket Management: View all tickets, respond, close

### Payment Integration
- Razorpay order creation and verification
- Auto email receipt on successful payment
- Purchase history tracking

### Test Portal
- Students view tests and submit answers
- Teachers/Admin evaluate submissions with score and feedback
- Progress tracking for students

### AI Enquiry Bot
- Powered by GPT-4o-mini via Emergent LLM
- Answers UPSC preparation queries, course info, admissions
- Chat history stored in MongoDB

### Grievance Portal
- Students raise tickets (Tech/Academic categories)
- Admin responds and closes tickets
- Full conversation thread

## API Endpoints
- Auth: /api/auth/register, /api/auth/login, /api/auth/me, /api/auth/send-otp, /api/auth/verify-otp
- Courses: /api/courses (GET/POST), /api/courses/{id} (GET/PUT/DELETE)
- Videos: /api/courses/{id}/videos (POST), /api/videos/{id}/progress (PUT), /api/videos/{id}/metrics (PUT)
- Payments: /api/payments/create-order (POST), /api/payments/verify (POST)
- Tests: /api/tests (GET/POST), /api/tests/{id}/submit (POST), /api/tests/{id}/submissions (GET)
- Tickets: /api/tickets (GET/POST), /api/tickets/{id} (PUT)
- Chat: /api/chat (POST)
- CMS: /api/cms (GET), /api/cms/{key} (PUT)
- Admin: /api/admin/students, /api/admin/analytics, /api/admin/teachers

## Database Collections
users, courses, videos, enrollments, payments, tests, test_submissions, tickets, otp_records, cms_content, chat_messages, video_progress
