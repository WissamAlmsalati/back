const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const memberSubscriptionRoutes = require('./memberSubscriptionRoutes');
const bookingRoutes = require('./bookingRoutes');
const userController = require('../controllers/userController');

const router = express.Router();

// === ربط مسارات الاشتراكات المتداخلة ===
// تأكد من أن هذه المسارات محمية بشكل مناسب داخل memberSubscriptionRoutes إذا لزم الأمر
router.use('/:userId/subscriptions', authenticateToken, memberSubscriptionRoutes);

// === ربط مسارات الحجوزات المتداخلة ===
// تأكد من أن هذه المسارات محمية بشكل مناسب داخل bookingRoutes إذا لزم الأمر
router.use('/:userId/bookings', authenticateToken, bookingRoutes);

// === مسارات إدارة المستخدمين ===

// POST /api/users - إنشاء مستخدم جديد (بواسطة المسؤولين المصرح لهم)
// المنطق داخل userController.createUserByAdmin سيتحقق من قدرة الدور الحالي على إنشاء الدور المطلوب
router.post(
    '/',
    authenticateToken,
    authorizeRoles('SUPER_ADMIN', 'GYM_OWNER', 'RECEPTIONIST'), 
    userController.createUserByAdmin
);

// GET /api/users/me - عرض ملف المستخدم الحالي
router.get('/me', authenticateToken, userController.getCurrentUserProfile);

// PUT /api/users/me - تحديث ملف المستخدم الحالي
router.put('/me', authenticateToken, userController.updateCurrentUserProfile);

// --- المسارات التالية تتطلب صلاحيات أعلى ---

// GET /api/users - عرض جميع المستخدمين (SUPER_ADMIN فقط)
// يجب أن يأتي هذا المسار العام بعد المسارات الأكثر تحديدًا مثل /me أو /:userId/approve
// ولكن بما أن هذا GET والآخرون POST/PUT/GET مع /me، الترتيب الحالي جيد.
router.get('/', authenticateToken, authorizeRoles('SUPER_ADMIN'), userController.getAllUsers);

// PUT /api/users/:userId/approve - الموافقة على حساب GYM_OWNER
router.put(
    '/:userId/approve',
    authenticateToken,
    authorizeRoles('SUPER_ADMIN', 'ADMIN_STAFF'),
    userController.approveUserAccount
);

// GET /api/users/:userId - عرض ملف مستخدم معين
// userController.getUserProfileById يحتوي على منطق للتحقق مما إذا كان المستخدم الحالي هو نفسه أو SUPER_ADMIN
router.get('/:userId', authenticateToken, userController.getUserProfileById);

// PUT /api/users/:userId - تحديث ملف مستخدم معين (SUPER_ADMIN)
router.put('/:userId', authenticateToken, authorizeRoles('SUPER_ADMIN'), userController.updateUserById);

// PUT /api/users/:userId/role - تغيير دور مستخدم (SUPER_ADMIN)
router.put('/:userId/role', authenticateToken, authorizeRoles('SUPER_ADMIN'), userController.changeUserRole);

// DELETE /api/users/:userId - حذف (إلغاء تنشيط) مستخدم (SUPER_ADMIN)
router.delete('/:userId', authenticateToken, authorizeRoles('SUPER_ADMIN'), userController.deleteUserById);


module.exports = router;
