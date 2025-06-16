const express = require('express');
const gymController = require('../controllers/gymController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');
const branchRoutes = require('./branchRoutes');
const membershipPlanRoutes = require('./membershipPlanRoutes'); // تمت الإضافة
const trainingClassTypeRoutes = require('./trainingClassTypeRoutes'); // تمت الإضافة

const router = express.Router();

// === ربط مسارات الفروع المتداخلة ===
// أي طلب إلى /api/gyms/:gymId/branches سيتم توجيهه إلى branchRoutes
// سيتمكن branchRoutes من الوصول إلى :gymId بفضل mergeParams: true في branchRoutes
router.use('/:gymId/branches', branchRoutes); // تمت الإضافة

// === ربط مسارات خطط العضوية المتداخلة ===
// أي طلب إلى /api/gyms/:gymId/membership-plans سيتم توجيهه إلى membershipPlanRoutes
router.use('/:gymId/membership-plans', membershipPlanRoutes); // تمت الإضافة

// === ربط مسارات أنواع الحصص التدريبية المتداخلة ===
// أي طلب إلى /api/gyms/:gymId/class-types سيتم توجيهه إلى trainingClassTypeRoutes
router.use('/:gymId/class-types', trainingClassTypeRoutes); // تمت الإضافة

// === المسارات العامة (لا تتطلب توكن أو دور معين بالضرورة) ===
// GET /api/gyms - عرض جميع الصالات الرياضية
router.get('/', gymController.getAllGyms);

// GET /api/gyms/:id - عرض تفاصيل صالة رياضية معينة
router.get('/:id', gymController.getGymById);


// === المسارات المحمية (تتطلب توكن وأدوار معينة) ===

// POST /api/gyms - إنشاء صالة رياضية جديدة
// فقط GYM_OWNER أو SUPER_ADMIN يمكنهم إنشاء صالة.
// نفترض أن المستخدم الذي ينشئ الصالة سيصبح مالكها تلقائيًا.
router.post(
  '/',
  authenticateToken,
  authorizeRoles('GYM_OWNER', 'SUPER_ADMIN'), // يمكن تعديل الأدوار حسب الحاجة
  gymController.createGym
);

// PUT /api/gyms/:id - تحديث بيانات صالة رياضية
// فقط مالك الصالة أو SUPER_ADMIN يمكنهم التحديث.
router.put(
  '/:id',
  authenticateToken,
  // authorizeRoles('GYM_OWNER', 'SUPER_ADMIN'), // التحقق من الدور يتم داخل الخدمة الآن
  gymController.updateGym
);

// DELETE /api/gyms/:id - حذف صالة رياضية
// فقط مالك الصالة أو SUPER_ADMIN يمكنهم الحذف.
router.delete(
  '/:id',
  authenticateToken,
  // authorizeRoles('GYM_OWNER', 'SUPER_ADMIN'), // التحقق من الدور يتم داخل الخدمة الآن
  gymController.deleteGym
);

module.exports = router;
