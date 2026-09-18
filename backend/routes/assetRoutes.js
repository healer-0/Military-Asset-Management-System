const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize, Role } = require('../middlewares/rbacMiddleware');
const asset = require('../controllers/assetController');

const { ADMIN, BASE_COMMANDER } = Role;
const router = express.Router();

router.use(authenticate);

// All roles (non-admins see only their own base)
router.get('/dashboard', asset.getDashboard);
router.get('/bases', asset.listBases);
router.get('/equipment-types', asset.listEquipmentTypes);

// Admin only
router.post('/bases', authorize(ADMIN), asset.createBase);
router.post('/equipment-types', authorize(ADMIN), asset.createEquipmentType);

// Admin and base commander
router.get('/assignments', authorize(ADMIN, BASE_COMMANDER), asset.listAssignments);
router.post('/assignments', authorize(ADMIN, BASE_COMMANDER), asset.createAssignment);
router.get('/expenditures', authorize(ADMIN, BASE_COMMANDER), asset.listExpenditures);
router.post('/expenditures', authorize(ADMIN, BASE_COMMANDER), asset.createExpenditure);

module.exports = router;
