const prisma = require('../lib/prisma');
const { HttpError } = require('../middleware/errorHandler');
const {
  USER_COOKIE,
  cookieOptions,
  hashPassword,
  verifyPassword,
  signUserToken,
} = require('../lib/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, phone: user.phone };
}

async function signup(req, res, next) {
  try {
    const { email, password, name, phone } = req.body || {};
    if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required.');
    if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
    if (!name || !name.trim()) throw new HttpError(400, 'Name is required.');

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new HttpError(409, 'An account with that email already exists.');

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        name: name.trim(),
        phone: phone?.trim() || null,
      },
    });

    res.cookie(USER_COOKIE, signUserToken(user), cookieOptions);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, 'Email and password are required.');

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, 'Incorrect email or password.');
    }

    res.cookie(USER_COOKIE, signUserToken(user), cookieOptions);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie(USER_COOKIE, cookieOptions);
  res.json({ ok: true });
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new HttpError(401, 'Not logged in.');
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function myOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { select: { nameSnapshot: true, qty: true, priceCentsSnapshot: true } } },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, me, myOrders };
