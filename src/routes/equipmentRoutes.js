const express = require('express');
const equipmentController = require('../controllers/equipmentController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Router رئيسي للمعدات
const router = express.Router({ mergeParams: true }); // mergeParams مهم للمسارات المتداخلة

// GET /api/equipment - عرض جميع المعدات (يمكن فلترتها بـ branchId عبر query param)
// أو GET /api/branches/:branchId/equipment - عرض جميع معدات فرع معين
router.get('/', equipmentController.getAllEquipment);

// GET /api/equipment/:equipmentId - عرض تفاصيل معدة معينة
router.get('/:equipmentId', equipmentController.getEquipmentById);

// POST /api/branches/:branchId/equipment - إضافة معدة جديدة لفرع معين
// هذا المسار سيتم استخدامه كمسار متداخل.
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.post(
  '/', // المسار هنا هو '/' لأنه سيكون نسبيًا للمسار الأصلي
  authenticateToken,
  // authorizeRoles('GYM_OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER'), // يمكن إضافة أدوار إضافية
  equipmentController.createEquipment
);

// PUT /api/equipment/:equipmentId - تحديث بيانات معدة
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.put(
  '/:equipmentId',
  authenticateToken,
  equipmentController.updateEquipment
);

// DELETE /api/equipment/:equipmentId - حذف معدة
// الصلاحية (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.delete(
  '/:equipmentId',
  authenticateToken,
  equipmentController.deleteEquipment
);

module.exports = router;
