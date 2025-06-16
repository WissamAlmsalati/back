const express = require('express');
const trainingClassTypeController = require('../controllers/trainingClassTypeController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Router لـ TrainingClassType
const router = express.Router({ mergeParams: true }); // mergeParams مهم للمسارات المتداخلة

// === المسارات العامة لـ TrainingClassType (يمكن الوصول إليها عبر /api/class-types) ===

// GET /api/class-types - عرض جميع أنواع الحصص (العامة وتلك الخاصة بالصالات، يمكن فلترتها)
// يمكن استخدام query params مثل ?gymId=123 أو ?includeGlobal=false
router.get('/', trainingClassTypeController.getAllClassTypes);

// GET /api/class-types/:classTypeId - عرض تفاصيل نوع حصة معين
router.get('/:classTypeId', trainingClassTypeController.getClassTypeById);

// POST /api/class-types - إنشاء نوع حصة عام (فقط SUPER_ADMIN)
// أو إنشاء نوع حصة مرتبط بصالة إذا تم تمرير gymId في body (يتم التحقق من الصلاحية في الخدمة)
router.post(
  '/',
  authenticateToken,
  // authorizeRoles('SUPER_ADMIN'), // يمكن وضع تحقق أولي هنا للأنواع العامة
  trainingClassTypeController.createClassType
);

// PUT /api/class-types/:classTypeId - تحديث بيانات نوع حصة
// الصلاحيات (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.put(
  '/:classTypeId',
  authenticateToken,
  trainingClassTypeController.updateClassType
);

// DELETE /api/class-types/:classTypeId - حذف نوع حصة
// الصلاحيات (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.delete(
  '/:classTypeId',
  authenticateToken,
  trainingClassTypeController.deleteClassType
);


// === المسارات المتداخلة تحت Gym (سيتم استخدامها من gymRoutes.js) ===
// مثال: /api/gyms/:gymId/class-types

// GET /api/gyms/:gymId/class-types - عرض جميع أنواع الحصص لصالة معينة (والعامة)
// تم تغطيتها بالفعل بواسطة GET '/' أعلاه عندما يتم تمرير gymId من خلال mergeParams
// router.get('/', trainingClassTypeController.getAllClassTypes); // مكرر إذا تم استخدامه كمتداخل

// POST /api/gyms/:gymId/class-types - إنشاء نوع حصة جديد لصالة معينة
// تم تغطيتها بالفعل بواسطة POST '/' أعلاه عندما يتم تمرير gymId من خلال mergeParams
// router.post('/', authenticateToken, trainingClassTypeController.createClassType); // مكرر

module.exports = router;
