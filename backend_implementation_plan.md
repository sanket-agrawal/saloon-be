# 🔧 Backend Implementation Plan — Saloon Booking Platform

> **Stack**: TypeScript + Node.js + Fastify + Prisma + PostgreSQL + Redis + BullMQ + Docker Compose

---

## 📁 Project Structure

```
saloon-backend/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── .dockerignore
├── .env.example
├── .env
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── nginx/
│   ├── nginx.conf
│   └── ssl/                        # SSL certs (mounted volume)
├── src/
│   ├── index.ts                    # App entry point
│   ├── app.ts                      # Fastify app setup
│   ├── config/
│   │   ├── env.ts                  # Validated env vars (using envalid)
│   │   ├── database.ts             # Prisma client singleton
│   │   ├── redis.ts                # Redis client
│   │   └── logger.ts               # Pino logger config
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts      # Zod validation schemas
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.types.ts
│   │   ├── saloon/
│   │   │   ├── saloon.controller.ts
│   │   │   ├── saloon.service.ts
│   │   │   ├── saloon.schema.ts
│   │   │   ├── saloon.routes.ts
│   │   │   └── saloon.types.ts
│   │   ├── booking/
│   │   │   ├── booking.controller.ts
│   │   │   ├── booking.service.ts
│   │   │   ├── booking.schema.ts
│   │   │   ├── booking.routes.ts
│   │   │   └── booking.types.ts
│   │   ├── service/                # Saloon services (haircut, shave, etc.)
│   │   │   ├── service.controller.ts
│   │   │   ├── service.service.ts
│   │   │   ├── service.schema.ts
│   │   │   ├── service.routes.ts
│   │   │   └── service.types.ts
│   │   ├── slot/
│   │   │   ├── slot.controller.ts
│   │   │   ├── slot.service.ts
│   │   │   ├── slot.schema.ts
│   │   │   ├── slot.routes.ts
│   │   │   └── slot.types.ts
│   │   ├── payment/
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── payment.schema.ts
│   │   │   ├── payment.routes.ts
│   │   │   └── payment.types.ts
│   │   ├── review/
│   │   │   ├── review.controller.ts
│   │   │   ├── review.service.ts
│   │   │   ├── review.schema.ts
│   │   │   ├── review.routes.ts
│   │   │   └── review.types.ts
│   │   ├── notification/
│   │   │   ├── notification.service.ts
│   │   │   ├── whatsapp.provider.ts
│   │   │   ├── ivr.provider.ts
│   │   │   ├── sms.provider.ts      # SMS fallback
│   │   │   └── notification.types.ts
│   │   ├── qrcode/
│   │   │   ├── qrcode.controller.ts
│   │   │   ├── qrcode.service.ts
│   │   │   └── qrcode.routes.ts
│   │   └── admin/                   # Platform admin (us)
│   │       ├── admin.controller.ts
│   │       ├── admin.service.ts
│   │       ├── admin.routes.ts
│   │       └── admin.schema.ts
│   ├── jobs/
│   │   ├── queue.ts                 # BullMQ queue setup
│   │   ├── workers/
│   │   │   ├── reminder.worker.ts   # 10-min-before WhatsApp reminder
│   │   │   ├── ivr.worker.ts        # IVR auto-call after booking
│   │   │   ├── review.worker.ts     # Review request after service done
│   │   │   ├── confirmation.worker.ts # WhatsApp booking confirmation
│   │   │   └── cleanup.worker.ts    # Mark no-shows, expire old slots
│   │   └── schedulers/
│   │       ├── reminder.scheduler.ts
│   │       └── cleanup.scheduler.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT verification
│   │   ├── role.middleware.ts       # Role-based access (customer/owner/admin)
│   │   ├── rateLimiter.middleware.ts
│   │   └── errorHandler.ts
│   ├── utils/
│   │   ├── apiResponse.ts          # Standardized API responses
│   │   ├── errors.ts               # Custom error classes
│   │   ├── pagination.ts           # Cursor & offset pagination
│   │   ├── slotGenerator.ts        # Generate time slots from schedule
│   │   └── validators.ts           # Shared validation helpers
│   └── types/
│       ├── fastify.d.ts            # Fastify type augmentations
│       └── global.d.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── scripts/
    ├── seed.ts
    └── migrate.sh
```

---

## 🗄️ Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ─────────────────────────────────────────────

enum UserRole {
  CUSTOMER
  SALOON_OWNER
  ADMIN
}

enum BookingStatus {
  PENDING         // Payment/confirmation awaited
  CONFIRMED       // Booking confirmed
  IN_PROGRESS     // Service started
  COMPLETED       // Service done
  CANCELLED       // Cancelled by user/owner
  NO_SHOW         // Customer didn't show up
}

enum PaymentStatus {
  PENDING
  CAPTURED
  REFUNDED
  FAILED
}

enum SubscriptionPlan {
  BASIC           // ₹499 — no notifications
  STANDARD        // ₹999 — WhatsApp notifications
  PREMIUM         // ₹1499 — WhatsApp + IVR + analytics
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

// ─── MODELS ────────────────────────────────────────────

model User {
  id            String      @id @default(cuid())
  phone         String      @unique
  name          String?
  email         String?
  role          UserRole    @default(CUSTOMER)
  avatarUrl     String?
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relations
  bookings      Booking[]
  reviews       Review[]
  ownedSaloons  Saloon[]    @relation("SaloonOwner")

  @@index([phone])
  @@map("users")
}

model Saloon {
  id              String            @id @default(cuid())
  name            String
  slug            String            @unique  // URL-friendly name
  ownerId         String
  phone           String
  email           String?
  description     String?
  address         String
  city            String
  state           String            @default("Maharashtra")
  pincode         String
  latitude        Float?
  longitude       Float?
  coverImageUrl   String?
  logoUrl         String?
  qrCodeUrl       String?           // Generated QR code image URL

  // Business settings
  slotDurationMin Int               @default(30)    // Default slot duration
  maxAdvanceDays  Int               @default(7)     // How far ahead can book
  requireAdvance  Boolean           @default(false) // Require advance payment?
  advanceAmount   Float?                            // Advance amount in ₹
  cancellationMin Int               @default(60)    // Free cancel before X mins
  walkInBuffer    Int               @default(2)     // Reserved walk-in slots/hour
  autoConfirm     Boolean           @default(true)  // Auto-confirm bookings?

  // Subscription
  plan            SubscriptionPlan  @default(BASIC)
  planExpiresAt   DateTime?
  isActive        Boolean           @default(true)
  isVerified      Boolean           @default(false)

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relations
  owner           User              @relation("SaloonOwner", fields: [ownerId], references: [id])
  services        Service[]
  staff           Staff[]
  bookings        Booking[]
  reviews         Review[]
  schedule        SaloonSchedule[]
  holidays        SaloonHoliday[]
  gallery         SaloonGallery[]
  subscription    SaloonSubscription[]

  @@index([city])
  @@index([slug])
  @@index([ownerId])
  @@index([latitude, longitude])
  @@map("saloons")
}

model SaloonSchedule {
  id          String    @id @default(cuid())
  saloonId    String
  dayOfWeek   DayOfWeek
  openTime    String    // "09:00" (24hr format)
  closeTime   String    // "21:00"
  breakStart  String?   // "13:00" (lunch break)
  breakEnd    String?   // "14:00"
  isOpen      Boolean   @default(true)

  saloon      Saloon    @relation(fields: [saloonId], references: [id], onDelete: Cascade)

  @@unique([saloonId, dayOfWeek])
  @@map("saloon_schedules")
}

model SaloonHoliday {
  id          String    @id @default(cuid())
  saloonId    String
  date        DateTime  @db.Date
  reason      String?

  saloon      Saloon    @relation(fields: [saloonId], references: [id], onDelete: Cascade)

  @@unique([saloonId, date])
  @@map("saloon_holidays")
}

model SaloonGallery {
  id          String    @id @default(cuid())
  saloonId    String
  imageUrl    String
  caption     String?
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())

  saloon      Saloon    @relation(fields: [saloonId], references: [id], onDelete: Cascade)

  @@map("saloon_gallery")
}

model Staff {
  id          String    @id @default(cuid())
  saloonId    String
  name        String
  phone       String?
  avatarUrl   String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())

  saloon      Saloon    @relation(fields: [saloonId], references: [id], onDelete: Cascade)
  bookings    Booking[]

  @@map("staff")
}

model Service {
  id          String    @id @default(cuid())
  saloonId    String
  name        String    // "Haircut", "Beard Trim", "Facial"
  description String?
  durationMin Int       // Duration in minutes
  price       Float     // Price in ₹
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  saloon      Saloon    @relation(fields: [saloonId], references: [id], onDelete: Cascade)
  bookings    BookingService[]

  @@map("services")
}

model Booking {
  id              String          @id @default(cuid())
  bookingNumber   String          @unique  // Human-readable: "BK-20261002-001"
  userId          String
  saloonId        String
  staffId         String?         // Assigned barber (nullable for auto-assign)
  slotDate        DateTime        @db.Date
  slotStartTime   String          // "14:30" (24hr)
  slotEndTime     String          // "15:00"
  totalDuration   Int             // Total minutes
  totalAmount     Float           // Total service price
  status          BookingStatus   @default(PENDING)

  // Notification tracking
  confirmationSent  Boolean       @default(false)
  reminderSent      Boolean       @default(false)
  ivrSent           Boolean       @default(false)
  reviewRequested   Boolean       @default(false)

  // Cancellation
  cancelledAt     DateTime?
  cancelledBy     String?         // "customer" | "owner"
  cancelReason    String?

  // Timestamps
  checkedInAt     DateTime?       // When customer actually arrived
  completedAt     DateTime?       // When service finished
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  user            User            @relation(fields: [userId], references: [id])
  saloon          Saloon          @relation(fields: [saloonId], references: [id])
  staff           Staff?          @relation(fields: [staffId], references: [id])
  services        BookingService[]
  payment         Payment?
  review          Review?

  @@unique([saloonId, slotDate, slotStartTime, staffId])  // Prevent double booking
  @@index([userId])
  @@index([saloonId, slotDate])
  @@index([status])
  @@index([slotDate, slotStartTime])
  @@map("bookings")
}

model BookingService {
  id          String    @id @default(cuid())
  bookingId   String
  serviceId   String
  price       Float     // Price at time of booking (snapshot)
  duration    Int       // Duration at time of booking

  booking     Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  service     Service   @relation(fields: [serviceId], references: [id])

  @@map("booking_services")
}

model Payment {
  id                String          @id @default(cuid())
  bookingId         String          @unique
  razorpayOrderId   String?         @unique
  razorpayPaymentId String?         @unique
  amount            Float           // Amount in ₹
  currency          String          @default("INR")
  status            PaymentStatus   @default(PENDING)
  method            String?         // "upi", "card", "netbanking"
  refundAmount      Float?
  refundedAt        DateTime?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  booking           Booking         @relation(fields: [bookingId], references: [id])

  @@index([razorpayOrderId])
  @@map("payments")
}

model Review {
  id          String    @id @default(cuid())
  bookingId   String    @unique
  userId      String
  saloonId    String
  rating      Int       // 1-5
  comment     String?
  ownerReply  String?   // Saloon owner can reply
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  booking     Booking   @relation(fields: [bookingId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
  saloon      Saloon    @relation(fields: [saloonId], references: [id])

  @@index([saloonId])
  @@map("reviews")
}

model SaloonSubscription {
  id            String    @id @default(cuid())
  saloonId      String
  plan          SubscriptionPlan
  amount        Float
  startDate     DateTime
  endDate       DateTime
  razorpaySubId String?   // Razorpay subscription ID
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())

  saloon        Saloon    @relation(fields: [saloonId], references: [id])

  @@index([saloonId])
  @@map("saloon_subscriptions")
}

model OtpLog {
  id        String    @id @default(cuid())
  phone     String
  otp       String
  expiresAt DateTime
  verified  Boolean   @default(false)
  attempts  Int       @default(0)
  createdAt DateTime  @default(now())

  @@index([phone, otp])
  @@map("otp_logs")
}
```

---

## 🔌 API Endpoints

### Auth Module (`/api/v1/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/request-otp` | Send WhatsApp OTP to phone | Public |
| POST | `/verify-otp` | Verify OTP, return JWT | Public |
| POST | `/refresh` | Refresh access token | Refresh Token |
| POST | `/logout` | Invalidate refresh token | User |
| GET | `/me` | Get current user profile | User |
| PATCH | `/me` | Update profile (name, email) | User |

### Saloon Module (`/api/v1/saloons`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List/search saloons (city, name, location) | Public |
| GET | `/:slug` | Get saloon details by slug | Public |
| GET | `/:slug/available-slots` | Get available slots for a date | Public |
| GET | `/:slug/reviews` | Get saloon reviews (paginated) | Public |
| GET | `/:slug/gallery` | Get saloon gallery images | Public |
| POST | `/` | Register new saloon | User |
| GET | `/my/saloon` | Get owner's saloon(s) | Owner |
| PATCH | `/my/saloon/:id` | Update saloon details | Owner |
| PUT | `/my/saloon/:id/schedule` | Set weekly schedule | Owner |
| POST | `/my/saloon/:id/holidays` | Add holiday/off day | Owner |
| DELETE | `/my/saloon/:id/holidays/:holidayId` | Remove holiday | Owner |
| POST | `/my/saloon/:id/gallery` | Upload gallery image | Owner |
| DELETE | `/my/saloon/:id/gallery/:imageId` | Remove gallery image | Owner |

### Services Module (`/api/v1/saloons/:saloonId/services`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List all services for saloon | Public |
| POST | `/` | Add a service | Owner |
| PATCH | `/:id` | Update a service | Owner |
| DELETE | `/:id` | Deactivate a service | Owner |

### Staff Module (`/api/v1/saloons/:saloonId/staff`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List staff members | Public |
| POST | `/` | Add staff member | Owner |
| PATCH | `/:id` | Update staff member | Owner |
| DELETE | `/:id` | Deactivate staff | Owner |

### Booking Module (`/api/v1/bookings`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create new booking | Customer |
| GET | `/my` | List customer's bookings | Customer |
| GET | `/:id` | Get booking details | Customer/Owner |
| POST | `/:id/cancel` | Cancel booking | Customer/Owner |
| PATCH | `/:id/check-in` | Mark customer arrived | Owner |
| PATCH | `/:id/complete` | Mark service completed | Owner |
| PATCH | `/:id/no-show` | Mark as no-show | Owner |
| GET | `/saloon/:saloonId` | List saloon's bookings (date filter) | Owner |
| GET | `/saloon/:saloonId/today` | Today's bookings | Owner |
| GET | `/saloon/:saloonId/stats` | Booking statistics | Owner |

### Payment Module (`/api/v1/payments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/create-order` | Create Razorpay order | Customer |
| POST | `/verify` | Verify Razorpay payment signature | Customer |
| POST | `/:id/refund` | Initiate refund | Owner |
| POST | `/webhook` | Razorpay webhook handler | Razorpay (verified) |

### Review Module (`/api/v1/reviews`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Submit review for completed booking | Customer |
| PATCH | `/:id/reply` | Owner reply to review | Owner |
| DELETE | `/:id` | Delete own review | Customer |

### QR Code Module (`/api/v1/qr`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/saloon/:saloonId` | Generate/get QR code for saloon | Owner |
| GET | `/saloon/:saloonId/download` | Download QR as PNG/PDF | Owner |

### Admin Module (`/api/v1/admin`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/saloons` | List all saloons | Admin |
| PATCH | `/saloons/:id/verify` | Verify/approve saloon | Admin |
| PATCH | `/saloons/:id/status` | Activate/deactivate saloon | Admin |
| GET | `/stats` | Platform-wide statistics | Admin |
| GET | `/revenue` | Revenue report | Admin |

---

## ⚙️ Background Jobs (BullMQ + Redis)

### Queue Architecture

```
┌───────────────────────────────────────────────────────┐
│                    Redis (BullMQ)                      │
├───────────────┬───────────────┬───────────────────────┤
│ confirmation  │  reminder     │  review-request       │
│ queue         │  queue        │  queue                │
├───────────────┼───────────────┼───────────────────────┤
│ ivr-call      │  cleanup      │  subscription-check   │
│ queue         │  queue        │  queue                │
└───────┬───────┴───────┬───────┴───────────┬───────────┘
        │               │                   │
   ┌────▼────┐    ┌─────▼─────┐    ┌───────▼───────┐
   │ Worker  │    │  Worker   │    │    Worker     │
   │ Process │    │  Process  │    │   Process     │
   └─────────┘    └───────────┘    └───────────────┘
```

### Job Definitions

| Queue | Trigger | Action | Delay |
|-------|---------|--------|-------|
| `booking-confirmation` | Booking created | Send WhatsApp confirmation message | Immediate |
| `ivr-call` | Booking confirmed | Place IVR call to customer | 30 seconds after booking |
| `booking-reminder` | Booking confirmed | Send WhatsApp reminder | Scheduled: 10 min before slot |
| `review-request` | Booking marked complete | Send WhatsApp review link | 1 hour after completion |
| `no-show-checker` | Cron: every 5 min | Mark bookings as no-show if 15 min late | Cron |
| `slot-cleanup` | Cron: daily midnight | Release expired pending bookings | Cron |
| `subscription-checker` | Cron: daily | Check & warn expiring subscriptions | Cron |

### Worker Implementation Pattern

```typescript
// src/jobs/workers/reminder.worker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { whatsappProvider } from '../../modules/notification/whatsapp.provider';
import { prisma } from '../../config/database';

interface ReminderJobData {
  bookingId: string;
  userPhone: string;
  saloonName: string;
  slotTime: string;
}

const reminderWorker = new Worker<ReminderJobData>(
  'booking-reminder',
  async (job: Job<ReminderJobData>) => {
    const { bookingId, userPhone, saloonName, slotTime } = job.data;

    // Check booking still active
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.status === 'CANCELLED') {
      return { skipped: true, reason: 'Booking cancelled' };
    }

    // Send WhatsApp reminder
    await whatsappProvider.sendTemplateMessage({
      to: userPhone,
      template: 'booking_reminder',
      params: { saloonName, slotTime },
    });

    // Update booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: { reminderSent: true },
    });

    return { sent: true };
  },
  { connection: redis, concurrency: 5 }
);
```

---

## 🔐 Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────────┐
│  Client   │────────→│  Backend  │────────→│ OTPless/MSG91│
│           │  POST   │           │  Send   │              │
│           │ /request│           │ OTP via │              │
│           │  -otp   │           │WhatsApp │              │
└──────────┘         └──────────┘         └──────────────┘
     │                     │
     │  User receives OTP  │
     │  on WhatsApp        │
     │                     │
     │  POST /verify-otp   │
     │────────────────────→│
     │                     │──→ Verify OTP
     │                     │──→ Create/find user
     │                     │──→ Generate JWT pair
     │  { accessToken,     │
     │    refreshToken }   │
     │←────────────────────│
```

### JWT Strategy

```typescript
// Access Token: Short-lived (15 min)
{
  sub: "user_cuid",
  role: "CUSTOMER" | "SALOON_OWNER" | "ADMIN",
  exp: 900  // 15 minutes
}

// Refresh Token: Long-lived (30 days), stored in Redis
// On refresh: old refresh token invalidated (rotation)
```

---

## 🐳 Docker Compose Setup

### Production: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  # ─── NGINX REVERSE PROXY ─────────────────────────
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - api
    restart: always
    networks:
      - saloon-network

  # ─── API SERVER ───────────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://saloon:${DB_PASSWORD}@postgres:5432/saloon_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
      - WHATSAPP_API_KEY=${WHATSAPP_API_KEY}
      - EXOTEL_API_KEY=${EXOTEL_API_KEY}
      - EXOTEL_API_TOKEN=${EXOTEL_API_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    deploy:
      replicas: 2     # Run 2 instances behind Nginx
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    networks:
      - saloon-network

  # ─── BACKGROUND WORKER ───────────────────────────
  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    command: ["node", "dist/jobs/worker.js"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://saloon:${DB_PASSWORD}@postgres:5432/saloon_db
      - REDIS_URL=redis://redis:6379
      - WHATSAPP_API_KEY=${WHATSAPP_API_KEY}
      - EXOTEL_API_KEY=${EXOTEL_API_KEY}
      - EXOTEL_API_TOKEN=${EXOTEL_API_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
    networks:
      - saloon-network

  # ─── POSTGRESQL ───────────────────────────────────
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: saloon_db
      POSTGRES_USER: saloon
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "127.0.0.1:5432:5432"  # Only localhost
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U saloon -d saloon_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - saloon-network

  # ─── REDIS ───────────────────────────────────────
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"  # Only localhost
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - saloon-network

  # ─── BULL BOARD (Job monitoring UI) ──────────────
  bull-board:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    command: ["node", "dist/jobs/board.js"]
    environment:
      - REDIS_URL=redis://redis:6379
      - BULL_BOARD_PORT=3001
    depends_on:
      - redis
    restart: always
    networks:
      - saloon-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  saloon-network:
    driver: bridge
```

### Dockerfile (Multi-stage)

```dockerfile
# ── Build Stage ─────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ── Production Stage ────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
RUN npx prisma generate
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=otp:10m rate=5r/m;

    upstream api_servers {
        least_conn;
        server api:3000;
    }

    server {
        listen 80;
        server_name api.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000" always;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Stricter rate limit for OTP endpoints
        location /api/v1/auth/request-otp {
            limit_req zone=otp burst=3 nodelay;
            proxy_pass http://api_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # BullBoard (protected)
        location /admin/queues {
            auth_basic "Admin Area";
            auth_basic_user_file /etc/nginx/.htpasswd;
            proxy_pass http://bull-board:3001;
        }

        # Health check
        location /health {
            proxy_pass http://api_servers;
        }
    }
}
```

---

## 🔒 Environment Variables (`.env.example`)

```bash
# ── Server ──────────────────────────────────────────
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# ── Database ────────────────────────────────────────
DB_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://saloon:${DB_PASSWORD}@postgres:5432/saloon_db

# ── Redis ───────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── JWT ─────────────────────────────────────────────
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# ── WhatsApp (Interakt/Wati/MSG91) ─────────────────
WHATSAPP_PROVIDER=interakt     # interakt | wati | msg91
WHATSAPP_API_KEY=<api-key>
WHATSAPP_API_URL=https://api.interakt.ai/v1

# ── OTP (OTPless or MSG91) ─────────────────────────
OTP_PROVIDER=otpless           # otpless | msg91
OTPLESS_CLIENT_ID=<client-id>
OTPLESS_CLIENT_SECRET=<client-secret>

# ── Razorpay ────────────────────────────────────────
RAZORPAY_KEY_ID=<key-id>
RAZORPAY_KEY_SECRET=<key-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret>

# ── IVR (Exotel) ───────────────────────────────────
EXOTEL_API_KEY=<api-key>
EXOTEL_API_TOKEN=<api-token>
EXOTEL_SID=<account-sid>
EXOTEL_CALLER_ID=<caller-id>

# ── File Storage (S3-compatible) ───────────────────
S3_BUCKET=saloon-uploads
S3_REGION=ap-south-1
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_ENDPOINT=https://s3.ap-south-1.amazonaws.com
```

---

## 🛡️ Middleware Stack

```typescript
// Applied in order:
app.register(cors, { origin: [env.FRONTEND_URL], credentials: true });
app.register(helmet);                        // Security headers
app.register(compress);                      // Gzip responses
app.register(rateLimit, { max: 100 });       // Global rate limit
app.addHook('onRequest', requestLogger);     // Log all requests
app.addHook('preHandler', parseJWT);         // Extract JWT if present
app.setErrorHandler(globalErrorHandler);     // Catch-all error handler
```

---

## 📊 Monitoring & Logging

| Concern | Tool | Notes |
|---------|------|-------|
| Structured Logging | **Pino** (built into Fastify) | JSON logs, log levels |
| Log Aggregation | **Dozzle** (Docker container) | View logs in browser |
| Uptime Monitoring | **UptimeRobot** (free) | Ping health endpoint |
| Error Tracking | **Sentry** (free tier) | Catch unhandled errors |
| Metrics | **BullBoard** | Monitor job queues |
| DB Monitoring | **pgAdmin** (optional container) | Query/inspect DB |

---

## 🔒 Security Checklist

- [x] Input validation with Zod on every endpoint
- [x] SQL injection prevention via Prisma (parameterized queries)
- [x] Rate limiting (global + stricter on OTP)
- [x] JWT token rotation (refresh tokens)
- [x] CORS restricted to frontend domain
- [x] Helmet security headers
- [x] HTTPS enforced via Nginx
- [x] Password-less auth (OTP only — no passwords to leak)
- [x] Razorpay webhook signature verification
- [x] Environment variables for all secrets
- [x] Non-root Docker user
- [x] Database port not exposed publicly
- [x] Redis port not exposed publicly

---

## 📅 Development Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **Phase 1**: Setup & Auth | Week 1 | Project scaffold, Docker, DB, Auth (OTP mock) |
| **Phase 2**: Saloon CRUD | Week 2 | Saloon registration, services, staff, schedule |
| **Phase 3**: Booking Engine | Week 3 | Slot generation, booking CRUD, conflict detection |
| **Phase 4**: Payments & QR | Week 4-5 | Razorpay integration, QR generation |
| **Phase 5**: Notifications | Week 6 | WhatsApp, IVR, background jobs, reminders |
| **Phase 6**: Polish & Deploy | Week 7-8 | Testing, error handling, VPS deploy, CI/CD |

---

## 🔄 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/saloon-backend
            git pull origin main
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
            docker compose exec api npx prisma migrate deploy
```
