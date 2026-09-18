const prisma = require('../config/db');
const { requireBaseId } = require('../middlewares/rbacMiddleware');
const { parseId, parseDate, parseFilters, withStockCheck } = require('./assetController');

const include = {
  fromBase: { select: { id: true, name: true } },
  toBase: { select: { id: true, name: true } },
  equipmentType: { select: { id: true, name: true, category: true } },
  createdBy: { select: { id: true, username: true } },
};

// GET /api/transfers?baseId=&equipmentTypeId=&startDate=&endDate=
// A base filter matches transfers going out of or coming into that base.
const listTransfers = async (req, res) => {
  const { baseId, equipmentTypeId, dateRange } = parseFilters(req);
  const transfers = await prisma.transfer.findMany({
    where: {
      equipmentTypeId,
      transferDate: dateRange,
      ...(baseId !== undefined && { OR: [{ fromBaseId: baseId }, { toBaseId: baseId }] }),
    },
    include,
    orderBy: { transferDate: 'desc' },
  });
  res.json(transfers);
};

// POST /api/transfers
// Non-admins can only send stock out of their own base.
const createTransfer = async (req, res) => {
  const body = req.body ?? {};
  const data = {
    fromBaseId: requireBaseId(req.user, parseId(body.fromBaseId, 'fromBaseId'), 'fromBaseId'),
    toBaseId: parseId(body.toBaseId, 'toBaseId', { required: true }),
    equipmentTypeId: parseId(body.equipmentTypeId, 'equipmentTypeId', { required: true }),
    quantity: parseId(body.quantity, 'quantity', { required: true }),
    transferDate: parseDate(body.transferDate, 'transferDate'),
    createdById: req.user.id,
  };
  if (data.fromBaseId === data.toBaseId) {
    return res.status(400).json({ message: 'Cannot transfer to the same base' });
  }

  const transfer = await withStockCheck({ ...data, baseId: data.fromBaseId }, (tx) =>
    tx.transfer.create({ data, include }),
  );
  res.status(201).json(transfer);
};

module.exports = { listTransfers, createTransfer };
