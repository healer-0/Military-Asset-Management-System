const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const { listTransfers, createTransfer } = require('../controllers/transferController');

const router = express.Router();

// All roles; non-admins are limited to their own base inside the controller.
router.use(authenticate);

router.get('/', listTransfers);
router.post('/', createTransfer);

module.exports = router;
