require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

// Development-only default password. Change it after first login.
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD;

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const alpha = await prisma.base.upsert({
    where: { name: 'Alpha Base' },
    update: {},
    create: { name: 'Alpha Base', location: 'North Sector' },
  });
  const bravo = await prisma.base.upsert({
    where: { name: 'Delta Base' },
    update: {},
    create: { name: 'Delta Base', location: 'South Sector' },
  });

  for (const [name, category] of [
    ['Assault Rifle', 'WEAPON'],
    ['Armored Vehicle', 'VEHICLE'],
    ['5.56mm Ammunition', 'AMMUNITION'],
  ]) {
    await prisma.equipmentType.upsert({ where: { name }, update: {}, create: { name, category } });
  }

  const users = [
    { username: 'admin_user', role: Role.ADMIN, baseId: null },
    { username: 'commander_alpha', role: Role.BASE_COMMANDER, baseId: alpha.id },
    { username: 'logistics_officer_alpha', role: Role.LOGISTICS_OFFICER, baseId: alpha.id },
    { username: 'commander_delta', role: Role.BASE_COMMANDER, baseId: bravo.id },
    { username: 'logistics_officer_delta', role: Role.LOGISTICS_OFFICER, baseId: bravo.id },
  ];
  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: { ...user, passwordHash },
    });
  }

  console.log(`Seeded ${users.length} users (password: ${DEFAULT_PASSWORD}), 2 bases, 3 equipment types`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
