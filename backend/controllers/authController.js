const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { Role } = require('../middlewares/rbacMiddleware');

const userSelect = {
  id: true,
  username: true,
  role: true,
  baseId: true,
  base: { select: { id: true, name: true } },
  createdAt: true,
};

// POST /api/auth/login
const login = async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) return res.status(401).json({ message: 'Invalid username or password' });

  const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, baseId: user.baseId },
  });
};

// GET /api/auth/me
const me = (req, res) => {
  res.json({ user: req.user });
};

// GET /api/auth/users (admin)
const listUsers = async (req, res) => {
  const users = await prisma.user.findMany({ select: userSelect, orderBy: { id: 'asc' } });
  res.json(users);
};

// POST /api/auth/users (admin)
const createUser = async (req, res) => {
  const { username, password, role } = req.body ?? {};
  const baseId = req.body?.baseId == null ? null : Number(req.body.baseId);

  if (typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ message: 'username must be at least 3 characters' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'password must be at least 8 characters' });
  }
  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ message: `role must be one of ${Object.values(Role).join(', ')}` });
  }
  if (role === Role.ADMIN && baseId !== null) {
    return res.status(400).json({ message: 'Admin users must not belong to a base' });
  }
  if (role !== Role.ADMIN && !Number.isInteger(baseId)) {
    return res.status(400).json({ message: 'baseId is required for this role' });
  }

  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      role,
      baseId,
    },
    select: userSelect,
  });
  res.status(201).json(user);
};

module.exports = { login, me, listUsers, createUser };
