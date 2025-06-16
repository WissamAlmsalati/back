const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware'); // تمت الإضافة

const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.login);

// @route   GET api/auth/me
// @desc    Get current user's information
// @access  Private (requires token)
router.get('/me', authenticateToken, authController.getCurrentUser); // Changed getMe to getCurrentUser

// يمكنك إضافة مسارات أخرى متعلقة بالمصادقة هنا لاحقًا، مثل:
// - /api/auth/forgot-password
// - /api/auth/reset-password

module.exports = router;
