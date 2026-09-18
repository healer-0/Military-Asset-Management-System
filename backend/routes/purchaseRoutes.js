const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const { listPurchases, createPurchase } = require('../controllers/purchaseController');

const router = express.Router();

// All roles; non-admins are limited to their own base inside the controller.
router.use(authenticate);

router.get('/', listPurchases);
router.post('/', createPurchase);

module.exports = router;
