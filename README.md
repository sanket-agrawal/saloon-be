# 💈 Saloon Booking Platform — Backend API

> Production-ready, enterprise-grade backend service for the Saloon Booking Platform built with **TypeScript**, **Node.js**, **Fastify**, **Prisma**, **PostgreSQL**, **Redis**, and **BullMQ**.

---

## 🚀 Tech Stack

- **Framework**: Fastify 5 (High throughput, low overhead)
- **Language**: TypeScript (Strict typing, ESM)
- **Database & ORM**: PostgreSQL 16 + Prisma ORM 6
- **Cache & Queue**: Redis 7 + BullMQ 5 (background jobs & delayed triggers)
- **Authentication**: Passwordless OTP via WhatsApp/SMS + JWT (Access Token & Redis Refresh Token Rotation)
- **Payment Gateway**: Razorpay (Orders, Signature Verification, Webhooks, Refunds)
- **Notifications**: WhatsApp (Interakt / Wati), IVR Call (Exotel), SMS fallback
- **Containerization**: Docker & Docker Compose (Multi-stage builds)
- **Proxy**: Nginx with SSL & Rate Limiting

---

## 📁 Directory Structure

```
saloon-backend/
├── docker-compose.yml          # Local Postgres & Redis development stack
├── docker-compose.prod.yml     # Full production stack (Nginx, API, Worker, DB, Redis, BullBoard)
├── Dockerfile                  # Multi-stage production container
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   ├── schema.prisma           # Complete database schema & models
│   └── seed.ts                 # Database seeder with demo saloon & users
├── nginx/
│   └── nginx.conf              # Reverse proxy configuration
├── scripts/
│   └── init-db.sql             # Postgres init scripts
├── src/
│   ├── index.ts                # Application entry point
│   ├── app.ts                  # Fastify server & plugin registration
│   ├── config/                 # Env validation, database, redis, logger
│   ├── modules/
│   │   ├── auth/               # OTP request/verify, JWT rotation, profile
│   │   ├── saloon/             # Saloon profiles, schedules, holidays, gallery
│   │   ├── service/            # Saloon service catalog (haircut, shave, etc.)
│   │   ├── staff/              # Staff management
│   │   ├── booking/            # Slot booking engine, conflict detection, check-in
│   │   ├── payment/            # Razorpay orders, verification, refunds, webhooks
│   │   ├── review/             # Booking reviews & owner replies
│   │   ├── qrcode/             # Dynamic booking QR code generation
│   │   ├── notification/       # WhatsApp, IVR & SMS providers
│   │   └── admin/              # Platform moderation & analytics
│   ├── jobs/                   # BullMQ queues, workers & schedulers
│   ├── middleware/             # Auth, RBAC, error handling, rate limiting
│   ├── utils/                  # Slot generator, pagination, custom errors, schemas
│   └── types/                  # Fastify & global type declarations
```

---

## 🛠️ Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Start PostgreSQL & Redis

Using Docker Compose:

```bash
docker compose up -d
```

### 3. Run Prisma Migrations & Seed

```bash
npx prisma db push
npm run prisma:seed
```

### 4. Run Development Server

```bash
npm run dev
```

The API will be running at `http://localhost:3000`.  
Health check endpoint: `http://localhost:3000/health`.

### 5. Run BullMQ Workers & Board

In separate terminal windows:

```bash
# Run background workers
npm run worker

# Run Bull Board queue monitoring UI
npm run board
```

Access Bull Board UI at `http://localhost:3001/admin/queues`.

---

## 🔌 API Endpoints Summary

### Auth (`/api/v1/auth`)
- `POST /request-otp` - Request 6-digit WhatsApp/SMS OTP
- `POST /verify-otp` - Verify OTP and obtain JWT tokens
- `POST /refresh` - Refresh access token using refresh token
- `POST /logout` - Revoke refresh token
- `GET /me` - Get current user profile
- `PATCH /me` - Update current user profile

### Saloons (`/api/v1/saloons`)
- `GET /` - Search & filter saloons (city, name, pagination)
- `GET /:slug` - Saloon details by slug
- `GET /:slug/available-slots?date=YYYY-MM-DD` - Dynamic available time slots
- `GET /:slug/reviews` - Reviews with ratings
- `GET /:slug/gallery` - Image gallery
- `POST /` - Register new saloon (Saloon Owner)
- `GET /my/saloon` - Get owner's saloons
- `PATCH /my/saloon/:id` - Update saloon details
- `PUT /my/saloon/:id/schedule` - Update weekly schedule
- `POST /my/saloon/:id/holidays` - Add holiday off-day
- `DELETE /my/saloon/:id/holidays/:holidayId` - Delete holiday
- `POST /my/saloon/:id/gallery` - Add gallery image
- `DELETE /my/saloon/:id/gallery/:imageId` - Delete gallery image

### Services (`/api/v1/saloons/:saloonId/services`)
- `GET /` - List all active services
- `POST /` - Add a service (Owner)
- `PATCH /:id` - Update service details (Owner)
- `DELETE /:id` - Deactivate service (Owner)

### Staff (`/api/v1/saloons/:saloonId/staff`)
- `GET /` - List active staff
- `POST /` - Add staff member (Owner)
- `PATCH /:id` - Update staff member (Owner)
- `DELETE /:id` - Deactivate staff member (Owner)

### Bookings (`/api/v1/bookings`)
- `POST /` - Create booking (Customer)
- `GET /my` - List customer's bookings
- `GET /:id` - Booking details
- `POST /:id/cancel` - Cancel booking
- `PATCH /:id/check-in` - Mark customer arrived (Owner)
- `PATCH /:id/complete` - Mark service complete (triggers review request job)
- `PATCH /:id/no-show` - Mark no-show (Owner)
- `GET /saloon/:saloonId` - List saloon bookings with date filter
- `GET /saloon/:saloonId/today` - Today's appointments
- `GET /saloon/:saloonId/stats` - Daily booking & revenue statistics

### Payments (`/api/v1/payments`)
- `POST /create-order` - Create Razorpay payment order
- `POST /verify` - Verify payment signature and confirm booking
- `POST /:id/refund` - Refund payment (Owner)
- `POST /webhook` - Razorpay webhook handler

### Reviews (`/api/v1/reviews`)
- `POST /` - Submit review for completed booking (Customer)
- `PATCH /:id/reply` - Owner reply to review
- `DELETE /:id` - Delete review

### QR Codes (`/api/v1/qr`)
- `GET /saloon/:saloonId` - Get direct booking QR code (data URL)
- `GET /saloon/:saloonId/download` - Download high-res QR code PNG

### Admin (`/api/v1/admin`)
- `GET /saloons` - List all registered saloons
- `PATCH /saloons/:id/verify` - Verify saloon
- `PATCH /saloons/:id/status` - Activate / deactivate saloon
- `GET /stats` - Platform-wide statistics
- `GET /revenue` - Revenue analytics
