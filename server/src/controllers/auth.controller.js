const prisma = require('../lib/prisma');
const { HttpError } = require('../middleware/errorHandler');
const {
  USER_COOKIE,
  cookieOptions,
  hashPassword,
  verifyPassword,
  signUserToken,
} = require('../lib/auth');
const { formatOrderNumber } = require('../lib/orderNumber');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone };
}

async function signup(req, res, next) {
  try {
    const { username, email, password, name, phone } = req.body || {};
    if (!username || !USERNAME_RE.test(username)) {
      throw new HttpError(400, 'Username must be 3-30 characters (letters, numbers, . _ - only).');
    }
    if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required.');
    if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
    if (!name || !name.trim()) throw new HttpError(400, 'Name is required.');

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.toLowerCase();

    const [existingUsername, existingEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username: normalizedUsername } }),
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
    ]);
    if (existingUsername) throw new HttpError(409, 'That username is already taken.');
    if (existingEmail) throw new HttpError(409, 'An account with that email already exists.');

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
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
    const { username, password } = req.body || {};
    if (!username || !password) throw new HttpError(400, 'Username and password are required.');

    const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, 'Incorrect username or password.');
    }
    if (!user.active) throw new HttpError(403, 'This account has been deactivated.');

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
    if (!user || !user.active) throw new HttpError(401, 'Not logged in.');
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// Change username/email/password — requires the current password so a
// logged-in-but-unattended browser can't have its credentials silently
// swapped out by someone else.
async function updateMe(req, res, next) {
  try {
    const { currentPassword, username, email, newPassword } = req.body || {};
    if (!currentPassword) throw new HttpError(400, 'Current password is required to make changes.');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(401, 'Current password is incorrect.');
    }

    const data = {};
    if (username !== undefined) {
      if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Username must be 3-30 characters (letters, numbers, . _ - only).');
      const normalized = username.trim().toLowerCase();
      if (normalized !== user.username) {
        const taken = await prisma.user.findUnique({ where: { username: normalized } });
        if (taken) throw new HttpError(409, 'That username is already taken.');
        data.username = normalized;
      }
    }
    if (email !== undefined) {
      if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required.');
      const normalized = email.toLowerCase();
      if (normalized !== user.email) {
        const taken = await prisma.user.findUnique({ where: { email: normalized } });
        if (taken) throw new HttpError(409, 'An account with that email already exists.');
        data.email = normalized;
      }
    }
    if (newPassword !== undefined) {
      if (newPassword.length < 8) throw new HttpError(400, 'New password must be at least 8 characters.');
      data.passwordHash = await hashPassword(newPassword);
    }

    const updated = Object.keys(data).length ? await prisma.user.update({ where: { id: user.id }, data }) : user;
    res.json({ user: publicUser(updated) });
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
    res.json(orders.map((o) => ({ ...o, orderNumber: formatOrderNumber(o.orderSeq) })));
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, me, updateMe, myOrders };
