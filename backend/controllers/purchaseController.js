const prisma = require('../config/db');
const { requireBaseId } = require('../middlewares/rbacMiddleware');
const { parseId, parseDate, parseFilters } = require('./assetController');

const include = {
  base: { select: { id: true, name: true } },
  equipmentType: { select: { id: true, name: true, category: true } },
  createdBy: { select: { id: true, username: true } },
};

// GET /api/purchases?baseId=&equipmentTypeId=&startDate=&endDate=
const listPurchases = async (req, res) => {
  const { baseId, equipmentTypeId, dateRange } = parseFilters(req);
  const purchases = await prisma.purchase.findMany({
    where: { baseId, equipmentTypeId, purchaseDate: dateRange },
    include,
    orderBy: { purchaseDate: 'desc' },
  });
  res.json(purchases);
};

// POST /api/purchases
const createPurchase = async (req, res) => {
  const body = req.body ?? {};
  const purchase = await prisma.purchase.create({
    data: {
      baseId: requireBaseId(req.user, parseId(body.baseId, 'baseId')),
      equipmentTypeId: parseId(body.equipmentTypeId, 'equipmentTypeId', { required: true }),
      quantity: parseId(body.quantity, 'quantity', { required: true }),
      purchaseDate: parseDate(body.purchaseDate, 'purchaseDate'),
      createdById: req.user.id,
    },
    include,
  });
  res.status(201).json(purchase);
};

module.exports = { listPurchases, createPurchase };
