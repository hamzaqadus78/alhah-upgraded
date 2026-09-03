/**
 * One-time local setup: creates the first Admin account. There is no
 * public admin signup route — after this, additional admins are created
 * from inside the dashboard by an already-logged-in admin.
 *
 * Usage: npm run create-admin -- "username" "email@example.com" "Full Name" "password123"
 */
require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { hashPassword } = require('../src/lib/auth');

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

async function main() {
  const [username, email, name, password] = process.argv.slice(2);

  if (!username || !email || !name || !password) {
    console.log('Usage: npm run create-admin -- "username" "email@example.com" "Full Name" "password123"');
    process.exit(1);
  }
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!USERNAME_RE.test(normalizedUsername)) throw new Error('Username must be 3-30 characters (letters, numbers, . _ - only).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Invalid email.');
  if (!name.trim()) throw new Error('Name is required.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const [existingUsername, existingEmail] = await Promise.all([
    prisma.admin.findUnique({ where: { username: normalizedUsername } }),
    prisma.admin.findUnique({ where: { email: normalizedEmail } }),
  ]);
  if (existingUsername) throw new Error(`An admin with username ${normalizedUsername} already exists.`);
  if (existingEmail) throw new Error(`An admin with email ${normalizedEmail} already exists.`);

  const admin = await prisma.admin.create({
    data: { username: normalizedUsername, email: normalizedEmail, name: name.trim(), passwordHash: await hashPassword(password) },
  });

  console.log(`\nAdmin account created: ${admin.username} / ${admin.email} (id ${admin.id})`);
  console.log('Log in at admin-login.html with this username and password.');
}

main()
  .catch((e) => {
    console.error(`\nFailed: ${e.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
