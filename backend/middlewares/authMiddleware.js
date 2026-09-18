const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Load the user on every request so role/base changes and deletions apply immediately.
  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, username: true, role: true, baseId: true },
  });
  if (!user) return res.status(401).json({ message: 'User no longer exists' });

  req.user = user;
  next();
};

module.exports = { authenticate };
