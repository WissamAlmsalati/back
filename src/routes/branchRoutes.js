const express = require('express');
const branchController = require('../controllers/branchController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const equipmentRoutes = require('./equipmentRoutes');
const scheduledSessionRoutes = require('./scheduledSessionRoutes'); // تمت الإضافة

// سنقوم بإنشاء نوعين من الـ routers هنا:
// 1. router رئيسي للوصول المباشر للفروع (مثل /api/branches, /api/branches/:branchId)
// 2. router متداخل سيتم استخدامه داخل gymRoutes (مثل /api/gyms/:gymId/branches)

// Router رئيسي للفروع
const router = express.Router({ mergeParams: true }); // mergeParams مهم للمسارات المتداخلة

// === ربط مسارات المعدات المتداخلة ===
// أي طلب إلى /api/branches/:branchId/equipment (أو /api/gyms/:gymId/branches/:branchId/equipment)
// سيتم توجيهه إلى equipmentRoutes
router.use('/:branchId/equipment', equipmentRoutes); // تمت الإضافة

// === ربط مسارات الجلسات المجدولة المتداخلة ===
// أي طلب إلى /api/branches/:branchId/scheduled-sessions (أو /api/gyms/:gymId/branches/:branchId/scheduled-sessions)
// سيتم توجيهه إلى scheduledSessionRoutes
router.use('/:branchId/scheduled-sessions', scheduledSessionRoutes); // تمت الإضافة

// GET /api/branches - عرض جميع الفروع (يمكن فلترتها بـ gymId عبر query param)
// أو GET /api/gyms/:gymId/branches - عرض جميع فروع صالة معينة
router.get('/', branchController.getAllBranches);

// GET /api/branches/:branchId - عرض تفاصيل فرع معين
router.get('/:branchId', branchController.getBranchById);

// POST /api/gyms/:gymId/branches - إنشاء فرع جديد لصالة معينة
// هذا المسار سيتم استخدامه كمسار متداخل.
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.post(
  '/', // المسار هنا هو '/' لأنه سيكون نسبيًا للمسار الأصلي /api/gyms/:gymId/branches
  authenticateToken,
  // authorizeRoles('GYM_OWNER', 'SUPER_ADMIN'), // يمكن إضافته إذا أردت تحققًا إضافيًا هنا
  branchController.createBranch
);

// PUT /api/branches/:branchId - تحديث بيانات فرع
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.put(
  '/:branchId',
  authenticateToken,
  branchController.updateBranch
);

// DELETE /api/branches/:branchId - حذف فرع
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.delete(
  '/:branchId',
  authenticateToken,
  branchController.deleteBranch
);

module.exports = router;
