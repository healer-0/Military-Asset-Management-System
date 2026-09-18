const { Role } = require('@prisma/client');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

// Route guard: only the listed roles may continue.
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };

// Admins may target any base (undefined = all bases); everyone else is locked to their own base.
const resolveBaseId = (user, requestedBaseId) => {
  if (user.role === Role.ADMIN) return requestedBaseId;

  if (requestedBaseId !== undefined && requestedBaseId !== user.baseId) {
    throw httpError(403, 'You can only access data for your assigned base');
  }
  return user.baseId;
};

const requireBaseId = (user, requestedBaseId, field = 'baseId') => {
  const baseId = resolveBaseId(user, requestedBaseId);
  if (baseId == null) throw httpError(400, `${field} is required`);
  return baseId;
};

module.exports = { Role, httpError, authorize, resolveBaseId, requireBaseId };
