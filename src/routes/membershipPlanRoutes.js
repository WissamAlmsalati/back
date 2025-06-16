const express = require('express');
const membershipPlanController = require('../controllers/membershipPlanController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Router رئيسي لخطط العضوية
const router = express.Router({ mergeParams: true }); // mergeParams مهم للمسارات المتداخلة

// GET /api/membership-plans - عرض جميع الخطط (يمكن فلترتها بـ gymId عبر query param)
// أو GET /api/gyms/:gymId/membership-plans - عرض جميع خطط صالة معينة
router.get('/', membershipPlanController.getAllPlans);

// GET /api/membership-plans/:planId - عرض تفاصيل خطة معينة
router.get('/:planId', membershipPlanController.getPlanById);

// POST /api/gyms/:gymId/membership-plans - إنشاء خطة جديدة لصالة معينة
// هذا المسار سيتم استخدامه كمسار متداخل.
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.post(
  '/', // المسار هنا هو '/' لأنه سيكون نسبيًا للمسار الأصلي
  authenticateToken,
  // authorizeRoles('GYM_OWNER', 'SUPER_ADMIN'), // يمكن إضافته إذا أردت تحققًا إضافيًا هنا
  membershipPlanController.createPlan
);

// PUT /api/membership-plans/:planId - تحديث بيانات خطة
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.put(
  '/:planId',
  authenticateToken,
  membershipPlanController.updatePlan
);

// DELETE /api/membership-plans/:planId - حذف خطة
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.delete(
  '/:planId',
  authenticateToken,
  membershipPlanController.deletePlan
);

module.exports = router;
