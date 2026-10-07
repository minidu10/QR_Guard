// Fills the database with demo data. It DELETES existing users, shops, QR codes and payments.
// Run: pnpm --filter api seed   (or in Docker: docker compose exec api node dist/seed/run.js)
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../app.module';
import type { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SIM_LAST_RUN_KEY } from '../payment-drop/payment-simulator.service';
import { QrCodesService } from '../qrcodes/qrcodes.service';
import { RedisService } from '../redis/redis.service';
import { fakePayments, makeRandom } from './payments';

const DAYS = 14;

// Plain console output (Nest's own logs are turned off below to keep this short).
const log = (msg: string) => console.log(`[seed] ${msg}`);

const USERS: { key: string; name: string; email: string; phone: string; role: Role }[] = [
  {
    key: 'admin',
    name: 'Bank Admin',
    email: 'admin@qrguard.lk',
    phone: '+94770000001',
    role: 'admin',
  },
  {
    key: 'owner1',
    name: 'Nimal Perera',
    email: 'owner1@qrguard.lk',
    phone: '+94771234567',
    role: 'owner',
  },
  {
    key: 'owner2',
    name: 'Kamala Silva',
    email: 'owner2@qrguard.lk',
    phone: '+94772345678',
    role: 'owner',
  },
  {
    key: 'customer',
    name: 'Saman Kumara',
    email: 'customer@qrguard.lk',
    phone: '+94773456789',
    role: 'customer',
  },
];

// Real places in Sri Lanka. perHour = how busy the shop normally is.
const SHOPS = [
  {
    name: 'Perera Grocery',
    address: '45 Galle Road, Colombo 03',
    lat: 6.901,
    lng: 79.8524,
    owner: 'owner1',
    verified: true,
    perHour: 6,
  },
  {
    name: 'Lanka Pharmacy',
    address: '12 Dalada Veediya, Kandy',
    lat: 7.2936,
    lng: 80.635,
    owner: 'owner1',
    verified: true,
    perHour: 4,
  },
  {
    name: 'Sea Breeze Cafe',
    address: '8 Church Street, Galle',
    lat: 6.0267,
    lng: 80.217,
    owner: 'owner1',
    verified: true,
    perHour: 5,
  },
  {
    name: 'Silva Hardware',
    address: '101 High Level Road, Nugegoda',
    lat: 6.8722,
    lng: 79.8883,
    owner: 'owner2',
    verified: true,
    perHour: 3,
  },
  {
    name: 'Fresh Fruits Stall',
    address: 'Main Street, Pettah, Colombo 11',
    lat: 6.9366,
    lng: 79.85,
    owner: 'owner2',
    verified: false,
    perHour: 8,
  },
];

async function main() {
  // Safety: never wipe a real production database by mistake.
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ENABLED !== 'true') {
    throw new Error('Seeding is off in production. Set SEED_ENABLED=true only on a demo database.');
  }
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Set SEED_PASSWORD (at least 8 characters) for the demo users.');
  }

  // No live fake payments while seeding.
  process.env.PAYMENT_SIMULATOR = 'false';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const qrService = app.get(QrCodesService);

    // Removing users also removes their shops, QR codes and payments (ON DELETE CASCADE).
    await prisma.user.deleteMany();
    log('Cleared old data');

    const passwordHash = await bcrypt.hash(password, 10);
    const userIds: Record<string, string> = {};
    for (const u of USERS) {
      const user = await prisma.user.create({
        data: { name: u.name, email: u.email, phone: u.phone, role: u.role, passwordHash },
      });
      userIds[u.key] = user.id;
    }
    log(`Created ${USERS.length} users`);

    const random = makeRandom(2026);
    const now = new Date();
    let paymentCount = 0;

    for (const s of SHOPS) {
      const shop = await prisma.shop.create({
        data: {
          name: s.name,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          verified: s.verified,
          ownerId: userIds[s.owner],
        },
      });
      const qr = await qrService.createForShop(shop);

      const list = fakePayments({ days: DAYS, perHour: s.perHour, now, random });
      await prisma.payment.createMany({
        data: list.map((p) => ({ ...p, shopId: shop.id, merchantId: qr.merchantId })),
      });
      paymentCount += list.length;
      log(`${s.name}: merchant ${qr.merchantId}, ${list.length} payments`);
    }

    // One old, revoked QR code, so the "revoked" case can be shown.
    const silva = await prisma.shop.findFirstOrThrow({ where: { name: 'Silva Hardware' } });
    const old = await qrService.createForShop(silva);
    await prisma.qrCode.update({
      where: { id: old.id },
      data: { status: 'revoked', revokedAt: now },
    });

    // Fake payment history now ends "now". The live simulator continues from here.
    await app.get(RedisService).set(SIM_LAST_RUN_KEY, String(now.getTime()));

    log(`Done: ${SHOPS.length} shops, ${paymentCount} payments over ${DAYS} days`);
    log(`Demo logins: ${USERS.map((u) => u.email).join(', ')} (password = SEED_PASSWORD)`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
