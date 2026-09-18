const prisma = require('../config/db');

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const redact = (body) => {
  if (!body || typeof body !== 'object') return undefined;
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, /password/i.test(key) ? '[REDACTED]' : value]),
  );
};

// Records every write request (who, what, result) in the AuditLog table once the response is sent.
// Must be mounted after express.json() so the body is available.
const auditLogger = (req, res, next) => {
  if (!AUDITED_METHODS.has(req.method)) return next();

  const startedAt = Date.now();
  const requestBody = redact(req.body);

  res.on('finish', () => {
    prisma.auditLog
      .create({
        data: {
          userId: req.user?.id ?? null,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          requestBody,
          durationMs: Date.now() - startedAt,
        },
      })
      .catch((err) => console.error('Failed to write audit log:', err.message));
  });

  next();
};

module.exports = { auditLogger };
