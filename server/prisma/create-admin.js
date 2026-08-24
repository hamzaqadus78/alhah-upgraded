/**
 * One-time local setup: creates the first Admin account. There is no
 * public admin signup route — after this, additional admins are created
 * from inside the dashboard by an already-logged-in admin.
 *
 * Usage: npm run create-admin -- "email@example.com" "Full Name" "password123"
 */
require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { hashPassword } = require('../src/lib/auth');

async function main() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.log('Usage: npm run create-admin -- "email@example.com" "Full Name" "password123"');
    process.exit(1);
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Invalid email.');
  if (!name.trim()) throw new Error('Name is required.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const existing = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new Error(`An admin with email ${normalizedEmail} already exists.`);

  const admin = await prisma.admin.create({
    data: { email: normalizedEmail, name: name.trim(), passwordHash: await hashPassword(password) },
  });

  console.log(`\nAdmin account created: ${admin.email} (id ${admin.id})`);
  console.log('Log in at admin-login.html with this email and password.');
}

main()
  .catch((e) => {
    console.error(`\nFailed: ${e.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
