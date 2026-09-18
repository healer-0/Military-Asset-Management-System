const { Prisma } = require('@prisma/client');
const prisma = require('../config/db');
const { httpError, resolveBaseId, requireBaseId } = require('../middlewares/rbacMiddleware');

// ---------- Input helpers (shared with purchase/transfer controllers) ----------

const parseId = (value, field, { required = false } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw httpError(400, `${field} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw httpError(400, `${field} must be a positive integer`);
  return n;
};

// A date-only endDate ("2026-09-16") covers the whole day.
const parseDate = (value, field, { endOfDay = false } = {}) => {
  if (value === undefined || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw httpError(400, `${field} is not a valid date`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
  return date;
};

// Reads ?baseId=&equipmentTypeId=&startDate=&endDate= and applies base scoping for the user.
const parseFilters = (req) => {
  const startDate = parseDate(req.query.startDate, 'startDate');
  const endDate = parseDate(req.query.endDate, 'endDate', { endOfDay: true });
  if (startDate && endDate && startDate > endDate) {
    throw httpError(400, 'startDate must not be after endDate');
  }
  return {
    baseId: resolveBaseId(req.user, parseId(req.query.baseId, 'baseId')),
    equipmentTypeId: parseId(req.query.equipmentTypeId, 'equipmentTypeId'),
    startDate,
    endDate,
    dateRange: startDate || endDate ? { gte: startDate, lte: endDate } : undefined,
  };
};

// ---------- Balance calculation ----------

const MOVEMENTS = [
  { key: 'purchases', model: 'purchase', dateField: 'purchaseDate', baseField: 'baseId' },
  { key: 'transfersIn', model: 'transfer', dateField: 'transferDate', baseField: 'toBaseId' },
  { key: 'transfersOut', model: 'transfer', dateField: 'transferDate', baseField: 'fromBaseId' },
  { key: 'assigned', model: 'assignment', dateField: 'assignedDate', baseField: 'baseId' },
  { key: 'expended', model: 'expenditure', dateField: 'expendedDate', baseField: 'baseId' },
];

// Returns { purchases: Map<equipmentTypeId, qty>, transfersIn: Map, ... }.
// Queries run one at a time so this is safe inside an interactive transaction.
const sumMovements = async (client, { baseId, equipmentTypeId, dateFilter }) => {
  const sums = {};
  for (const { key, model, dateField, baseField } of MOVEMENTS) {
    const groups = await client[model].groupBy({
      by: ['equipmentTypeId'],
      where: { [baseField]: baseId, equipmentTypeId, [dateField]: dateFilter },
      _sum: { quantity: true },
    });
    sums[key] = new Map(groups.map((g) => [g.equipmentTypeId, g._sum.quantity ?? 0]));
  }
  return sums;
};

// Net Movement    = Purchases + Transfers In - Transfers Out
// Closing Balance = Opening Balance + Net Movement - Assigned - Expended
const computeBalance = (openingBalance, sums, equipmentTypeId) => {
  const qty = (key) => sums[key].get(equipmentTypeId) ?? 0;
  const purchases = qty('purchases');
  const transfersIn = qty('transfersIn');
  const transfersOut = qty('transfersOut');
  const assigned = qty('assigned');
  const expended = qty('expended');
  const netMovement = purchases + transfersIn - transfersOut;

  return {
    openingBalance,
    purchases,
    transfersIn,
    transfersOut,
    netMovement,
    assigned,
    expended,
    closingBalance: openingBalance + netMovement - assigned - expended,
  };
};

// Runs `create` only if the base has enough stock. Serializable isolation stops two
// concurrent requests from both spending the same stock.
const withStockCheck = async ({ baseId, equipmentTypeId, quantity }, create) => {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const sums = await sumMovements(tx, { baseId, equipmentTypeId });
        const available = computeBalance(0, sums, equipmentTypeId).closingBalance;
        if (quantity > available) {
          throw httpError(400, `Insufficient stock: ${available} available, ${quantity} requested`);
        }
        return create(tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err.code === 'P2034') throw httpError(409, 'Stock changed by another request, please retry');
    throw err;
  }
};

// ---------- Dashboard ----------

// GET /api/assets/dashboard?baseId=&equipmentTypeId=&startDate=&endDate=
// Without startDate the opening balance is 0 (start of history).
const getDashboard = async (req, res) => {
  const { baseId, equipmentTypeId, startDate, endDate, dateRange } = parseFilters(req);

  const before = startDate
    ? await sumMovements(prisma, { baseId, equipmentTypeId, dateFilter: { lt: startDate } })
    : null;
  const period = await sumMovements(prisma, { baseId, equipmentTypeId, dateFilter: dateRange });

  const equipmentTypes = await prisma.equipmentType.findMany({
    where: { id: equipmentTypeId },
    select: { id: true, name: true, category: true },
    orderBy: { name: 'asc' },
  });

  const items = equipmentTypes.map((equipmentType) => {
    const openingBalance = before ? computeBalance(0, before, equipmentType.id).closingBalance : 0;
    return { equipmentType, ...computeBalance(openingBalance, period, equipmentType.id) };
  });

  const totals = {};
  for (const { equipmentType, ...values } of items) {
    for (const [key, value] of Object.entries(values)) totals[key] = (totals[key] ?? 0) + value;
  }

  res.json({
    filters: {
      baseId: baseId ?? null,
      equipmentTypeId: equipmentTypeId ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    },
    totals,
    items,
  });
};

// ---------- Bases & equipment types ----------

// GET /api/assets/bases
// All roles see every base name (needed to pick a transfer destination); stock data stays scoped.
const listBases = async (req, res) => {
  const bases = await prisma.base.findMany({ orderBy: { name: 'asc' } });
  res.json(bases);
};

// POST /api/assets/bases (admin)
const createBase = async (req, res) => {
  const { name, location } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'name is required' });
  }
  const base = await prisma.base.create({ data: { name: name.trim(), location } });
  res.status(201).json(base);
};

// GET /api/assets/equipment-types
const listEquipmentTypes = async (req, res) => {
  const equipmentTypes = await prisma.equipmentType.findMany({ orderBy: { name: 'asc' } });
  res.json(equipmentTypes);
};

// POST /api/assets/equipment-types (admin)
const createEquipmentType = async (req, res) => {
  const { name, category } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ message: 'name and category are required' });
  }
  const equipmentType = await prisma.equipmentType.create({
    data: { name: name.trim(), category: category.trim() },
  });
  res.status(201).json(equipmentType);
};

// ---------- Assignments & expenditures (stock leaving the base) ----------

const include = {
  base: { select: { id: true, name: true } },
  equipmentType: { select: { id: true, name: true, category: true } },
  createdBy: { select: { id: true, username: true } },
};

// GET /api/assets/assignments
const listAssignments = async (req, res) => {
  const { baseId, equipmentTypeId, dateRange } = parseFilters(req);
  const assignments = await prisma.assignment.findMany({
    where: { baseId, equipmentTypeId, assignedDate: dateRange },
    include,
    orderBy: { assignedDate: 'desc' },
  });
  res.json(assignments);
};

// POST /api/assets/assignments
const createAssignment = async (req, res) => {
  const body = req.body ?? {};
  if (typeof body.assignedTo !== 'string' || !body.assignedTo.trim()) {
    return res.status(400).json({ message: 'assignedTo is required' });
  }
  const data = {
    baseId: requireBaseId(req.user, parseId(body.baseId, 'baseId')),
    equipmentTypeId: parseId(body.equipmentTypeId, 'equipmentTypeId', { required: true }),
    quantity: parseId(body.quantity, 'quantity', { required: true }),
    assignedTo: body.assignedTo.trim(),
    assignedDate: parseDate(body.assignedDate, 'assignedDate'),
    createdById: req.user.id,
  };

  const assignment = await withStockCheck(data, (tx) => tx.assignment.create({ data, include }));
  res.status(201).json(assignment);
};

// GET /api/assets/expenditures
const listExpenditures = async (req, res) => {
  const { baseId, equipmentTypeId, dateRange } = parseFilters(req);
  const expenditures = await prisma.expenditure.findMany({
    where: { baseId, equipmentTypeId, expendedDate: dateRange },
    include,
    orderBy: { expendedDate: 'desc' },
  });
  res.json(expenditures);
};

// POST /api/assets/expenditures
const createExpenditure = async (req, res) => {
  const body = req.body ?? {};
  const data = {
    baseId: requireBaseId(req.user, parseId(body.baseId, 'baseId')),
    equipmentTypeId: parseId(body.equipmentTypeId, 'equipmentTypeId', { required: true }),
    quantity: parseId(body.quantity, 'quantity', { required: true }),
    reason: typeof body.reason === 'string' ? body.reason.trim() : undefined,
    expendedDate: parseDate(body.expendedDate, 'expendedDate'),
    createdById: req.user.id,
  };

  const expenditure = await withStockCheck(data, (tx) => tx.expenditure.create({ data, include }));
  res.status(201).json(expenditure);
};

module.exports = {
  parseId,
  parseDate,
  parseFilters,
  withStockCheck,
  getDashboard,
  listBases,
  createBase,
  listEquipmentTypes,
  createEquipmentType,
  listAssignments,
  createAssignment,
  listExpenditures,
  createExpenditure,
};
