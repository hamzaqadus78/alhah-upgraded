const prisma = require('../../lib/prisma');
const { HttpError } = require('../../middleware/errorHandler');
const { hashPassword } = require('../../lib/auth');

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, email: true, name: true, phone: true,
        active: true, createdAt: true, _count: { select: { orders: true } },
      },
    });
    res.json(users.map((u) => ({ ...u, orderCount: u._count.orders, _count: undefined })));
  } catch (err) {
    next(err);
  }
}

// Soft-delete only — deactivating blocks login but keeps their order
// history intact (a real delete would break the Order.userId foreign key
// for any past orders, and orders must keep working regardless).
async function setUserActive(req, res, next) {
  try {
    const { active } = req.body || {};
    if (typeof active !== 'boolean') throw new HttpError(400, 'active must be true or false.');
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { active } });
    res.json({ id: user.id, active: user.active });
  } catch (err) {
    if (err.code === 'P2025') return next(new HttpError(404, 'User not found.'));
    next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 8) throw new HttpError(400, 'New password must be at least 8 characters.');
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return next(new HttpError(404, 'User not found.'));
    next(err);
  }
}

module.exports = { listUsers, setUserActive, resetUserPassword };
