import { PrismaClient, UserRole, DayOfWeek, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clean up existing test data
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.saloonGallery.deleteMany();
  await prisma.saloonHoliday.deleteMany();
  await prisma.saloonSchedule.deleteMany();
  await prisma.service.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.saloonSubscription.deleteMany();
  await prisma.saloon.deleteMany();
  await prisma.otpLog.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Admin
  const admin = await prisma.user.create({
    data: {
      phone: '9876543210',
      name: 'System Admin',
      email: 'admin@saloonapp.com',
      role: UserRole.ADMIN,
    },
  });

  // 3. Create Saloon Owner
  const owner = await prisma.user.create({
    data: {
      phone: '9988776655',
      name: 'Vikram Rathore',
      email: 'vikram@royalcuts.com',
      role: UserRole.SALOON_OWNER,
    },
  });

  // 4. Create Customer
  const customer = await prisma.user.create({
    data: {
      phone: '9123456789',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      role: UserRole.CUSTOMER,
    },
  });

  // 5. Create Demo Saloon
  const saloon = await prisma.saloon.create({
    data: {
      name: 'Royal Cuts Lounge',
      slug: 'royal-cuts-lounge',
      ownerId: owner.id,
      phone: '9988776655',
      email: 'contact@royalcuts.com',
      description: 'Premium grooming lounge for men. Expert hair styling, beard grooming, and facial treatments in Pune.',
      address: 'Shop 14, High Street Mall, Baner',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411045',
      latitude: 18.559,
      longitude: 73.7797,
      coverImageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
      logoUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200',
      slotDurationMin: 30,
      maxAdvanceDays: 7,
      requireAdvance: false,
      walkInBuffer: 1,
      autoConfirm: true,
      plan: 'PREMIUM',
      isVerified: true,
      isActive: true,
    },
  });

  // 6. Schedule (Mon - Sun)
  const days: DayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  for (const dayOfWeek of days) {
    await prisma.saloonSchedule.create({
      data: {
        saloonId: saloon.id,
        dayOfWeek,
        openTime: '09:00',
        closeTime: '21:00',
        breakStart: '13:00',
        breakEnd: '14:00',
        isOpen: true,
      },
    });
  }

  // 7. Staff
  const barber1 = await prisma.staff.create({
    data: {
      saloonId: saloon.id,
      name: 'Ramesh Stylist',
      phone: '9822001122',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    },
  });

  const barber2 = await prisma.staff.create({
    data: {
      saloonId: saloon.id,
      name: 'Sunil Master Barber',
      phone: '9822003344',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
  });

  // 8. Services
  const service1 = await prisma.service.create({
    data: {
      saloonId: saloon.id,
      name: 'Signature Haircut & Wash',
      description: 'Precision haircut with head wash and styling.',
      durationMin: 30,
      price: 350,
      sortOrder: 1,
    },
  });

  const service2 = await prisma.service.create({
    data: {
      saloonId: saloon.id,
      name: 'Beard Sculpting & Trim',
      description: 'Razor sharp beard trim with hot towel treatment and oil massage.',
      durationMin: 20,
      price: 200,
      sortOrder: 2,
    },
  });

  const service3 = await prisma.service.create({
    data: {
      saloonId: saloon.id,
      name: 'Royal Charcoal Facial',
      description: 'Deep cleansing and revitalizing facial treatment for clear skin.',
      durationMin: 45,
      price: 750,
      sortOrder: 3,
    },
  });

  // 9. Gallery
  await prisma.saloonGallery.createMany({
    data: [
      {
        saloonId: saloon.id,
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
        caption: 'Salon Interior & Styling Chairs',
        sortOrder: 1,
      },
      {
        saloonId: saloon.id,
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
        caption: 'Premium Grooming Station',
        sortOrder: 2,
      },
    ],
  });

  // 10. Sample Completed Booking & Review
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastBooking = await prisma.booking.create({
    data: {
      bookingNumber: 'BK-20261010-101',
      userId: customer.id,
      saloonId: saloon.id,
      staffId: barber1.id,
      slotDate: today,
      slotStartTime: '10:00',
      slotEndTime: '10:30',
      totalDuration: 30,
      totalAmount: 350,
      status: BookingStatus.COMPLETED,
      confirmationSent: true,
      reminderSent: true,
      reviewRequested: true,
      completedAt: new Date(),
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: pastBooking.id,
      serviceId: service1.id,
      price: 350,
      duration: 30,
    },
  });

  await prisma.review.create({
    data: {
      bookingId: pastBooking.id,
      userId: customer.id,
      saloonId: saloon.id,
      rating: 5,
      comment: 'Exceptional haircut and friendly staff! Will definitely visit again.',
      ownerReply: 'Thank you Rahul! Looking forward to serving you again soon.',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('Admin Phone: 9876543210');
  console.log('Saloon Owner Phone: 9988776655');
  console.log('Customer Phone: 9123456789');
  console.log('Saloon: /saloon/royal-cuts-lounge');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
