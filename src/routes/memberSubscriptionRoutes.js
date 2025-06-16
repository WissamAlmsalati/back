const express = require('express');
const memberSubscriptionController = require('../controllers/memberSubscriptionController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Router لـ MemberSubscription
const router = express.Router({ mergeParams: true }); // mergeParams مهم للمسارات المتداخلة

// === المسارات العامة لـ MemberSubscription (يمكن الوصول إليها عبر /api/subscriptions) ===

// GET /api/subscriptions - عرض جميع الاشتراكات (مع فلترة حسب الصلاحيات)
// يمكن استخدام query params مثل ?userId=1&planId=2&gymId=3&status=ACTIVE
router.get('/', authenticateToken, memberSubscriptionController.getAllSubscriptions);

// POST /api/subscriptions - إنشاء اشتراك جديد (عادة لمستخدم معين بواسطة admin أو المستخدم لنفسه)
// يتطلب userId و planId و startDate في req.body
router.post('/', authenticateToken, memberSubscriptionController.createSubscription);

// GET /api/subscriptions/:subscriptionId - عرض تفاصيل اشتراك معين
router.get('/:subscriptionId', authenticateToken, memberSubscriptionController.getSubscriptionById);

// PUT /api/subscriptions/:subscriptionId/status - تحديث حالة اشتراك معين
// يتطلب status في req.body
router.put('/:subscriptionId/status', authenticateToken, memberSubscriptionController.updateSubscriptionStatus);

// (اختياري) مسار لتشغيل تحديث الاشتراكات المنتهية يدويًا (SUPER_ADMIN فقط)
router.post('/admin/check-expired', authenticateToken, authorizeRoles('SUPER_ADMIN'), memberSubscriptionController.runCheckExpired);


// === المسارات المتداخلة تحت User (سيتم استخدامها من userRoutes.js) ===
// مثال: /api/users/:userId/subscriptions

// GET /api/users/:userId/subscriptions - عرض جميع اشتراكات مستخدم معين
// تم تغطيتها بالفعل بواسطة GET '/' أعلاه عندما يتم تمرير userId من خلال mergeParams
// أو عندما يتم تمرير userId كـ query param. المتحكم يعالج هذا.
// router.get('/', authenticateToken, memberSubscriptionController.getAllSubscriptions); // مكرر

// POST /api/users/:userId/subscriptions - إنشاء اشتراك جديد لمستخدم معين
// تم تغطيتها بالفعل بواسطة POST '/' أعلاه عندما يتم تمرير userId من خلال mergeParams
// router.post('/', authenticateToken, memberSubscriptionController.createSubscription); // مكرر

module.exports = router;
