const prisma = require('../../lib/prisma');
const { HttpError } = require('../../middleware/errorHandler');
const {
  ADMIN_COOKIE,
  cookieOptions,
  hashPassword,
  verifyPassword,
  signAdminToken,
} = require('../../lib/auth');

function publicAdmin(admin) {
  return { id: admin.id, email: admin.email, name: admin.name };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, 'Email and password are required.');

    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw new HttpError(401, 'Incorrect email or password.');
    }

    res.cookie(ADMIN_COOKIE, signAdminToken(admin), cookieOptions);
    res.json({ admin: publicAdmin(admin) });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie(ADMIN_COOKIE, cookieOptions);
  res.json({ ok: true });
}

async function me(req, res, next) {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.adminId } });
    if (!admin) throw new HttpError(401, 'Not logged in.');
    res.json({ admin: publicAdmin(admin) });
  } catch (err) {
    next(err);
  }
}

async function listAdmins(req, res, next) {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json(admins);
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'A valid email is required.');
    if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
    if (!name || !name.trim()) throw new HttpError(400, 'Name is required.');

    const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new HttpError(409, 'An admin with that email already exists.');

    const admin = await prisma.admin.create({
      data: { email: email.toLowerCase(), passwordHash: await hashPassword(password), name: name.trim() },
    });
    res.status(201).json(publicAdmin(admin));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me, listAdmins, createAdmin };
