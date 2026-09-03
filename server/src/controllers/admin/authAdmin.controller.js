const prisma = require('../../lib/prisma');
const { HttpError } = require('../../middleware/errorHandler');
const {
  ADMIN_COOKIE,
  cookieOptions,
  hashPassword,
  verifyPassword,
  signAdminToken,
} = require('../../lib/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

function publicAdmin(admin) {
  return { id: admin.id, username: admin.username, email: admin.email, name: admin.name };
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) throw new HttpError(400, 'Username and password are required.');

    const admin = await prisma.admin.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw new HttpError(401, 'Incorrect username or password.');
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

// Change username/email/password — requires the current password, same
// reasoning as the customer-side auth.controller.js updateMe.
async function updateMe(req, res, next) {
  try {
    const { currentPassword, username, email, newPassword } = req.body || {};
    if (!currentPassword) throw new HttpError(400, 'Current password is required to make changes.');

    const admin = await prisma.admin.findUnique({ where: { id: req.adminId } });
    if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      throw new HttpError(401, 'Current password is incorrect.');
    }

    const data = {};
    if (username !== undefined) {
      if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Username must be 3-30 characters (letters, numbers, . _ - only).');
      const normalized = username.trim().toLowerCase();
      if (normalized !== admin.username) {
        const taken = await prisma.admin.findUnique({ where: { username: normalized } });
        if (taken) throw new HttpError(409, 'That username is already taken.');
        data.username = normalized;
      }
    }
    if (email !== undefined) {
      if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required.');
      const normalized = email.toLowerCase();
      if (normalized !== admin.email) {
        const taken = await prisma.admin.findUnique({ where: { email: normalized } });
        if (taken) throw new HttpError(409, 'An admin with that email already exists.');
        data.email = normalized;
      }
    }
    if (newPassword !== undefined) {
      if (newPassword.length < 8) throw new HttpError(400, 'New password must be at least 8 characters.');
      data.passwordHash = await hashPassword(newPassword);
    }

    const updated = Object.keys(data).length ? await prisma.admin.update({ where: { id: admin.id }, data }) : admin;
    res.json({ admin: publicAdmin(updated) });
  } catch (err) {
    next(err);
  }
}

async function listAdmins(req, res, next) {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, username: true, email: true, name: true, createdAt: true },
    });
    res.json(admins);
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const { username, email, password, name } = req.body || {};
    if (!username || !USERNAME_RE.test(username)) {
      throw new HttpError(400, 'Username must be 3-30 characters (letters, numbers, . _ - only).');
    }
    if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required.');
    if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
    if (!name || !name.trim()) throw new HttpError(400, 'Name is required.');

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.toLowerCase();

    const [existingUsername, existingEmail] = await Promise.all([
      prisma.admin.findUnique({ where: { username: normalizedUsername } }),
      prisma.admin.findUnique({ where: { email: normalizedEmail } }),
    ]);
    if (existingUsername) throw new HttpError(409, 'That username is already taken.');
    if (existingEmail) throw new HttpError(409, 'An admin with that email already exists.');

    const admin = await prisma.admin.create({
      data: { username: normalizedUsername, email: normalizedEmail, passwordHash: await hashPassword(password), name: name.trim() },
    });
    res.status(201).json(publicAdmin(admin));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me, updateMe, listAdmins, createAdmin };
