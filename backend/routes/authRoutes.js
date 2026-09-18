const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize, Role } = require('../middlewares/rbacMiddleware');
const { login, me, listUsers, createUser } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, me);

// User management (admin only)
router.get('/users', authenticate, authorize(Role.ADMIN), listUsers);
router.post('/users', authenticate, authorize(Role.ADMIN), createUser);

module.exports = router;
