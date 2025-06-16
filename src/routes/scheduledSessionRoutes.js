const express = require('express');
const scheduledSessionController = require('../controllers/scheduledSessionController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Router لـ ScheduledSession
const router = express.Router({ mergeParams: true }); // mergeParams مهم للمسارات المتداخلة

// === المسارات العامة لـ ScheduledSession (يمكن الوصول إليها عبر /api/scheduled-sessions) ===

// GET /api/scheduled-sessions - عرض جميع الجلسات المجدولة (يمكن فلترتها)
// يمكن استخدام query params مثل ?branchId=1&startDate=...&instructorId=...&gymId=...
router.get('/', scheduledSessionController.getAllSessions);

// GET /api/scheduled-sessions/:sessionId - عرض تفاصيل جلسة معينة
router.get('/:sessionId', scheduledSessionController.getSessionById);

// POST /api/scheduled-sessions - (غير مستحسن مباشرة، يفضل الإنشاء تحت فرع)
// إذا أردت السماح به، تأكد من أن branchId موجود في req.body وأن المتحكم والخدمة يعالجان ذلك.
// router.post('/', authenticateToken, scheduledSessionController.createSession);


// PUT /api/scheduled-sessions/:sessionId - تحديث بيانات جلسة
// الصلاحيات (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.put(
  '/:sessionId',
  authenticateToken,
  scheduledSessionController.updateSession
);

// DELETE /api/scheduled-sessions/:sessionId - حذف جلسة
// الصلاحيات (مالك الصالة أو SUPER_ADMIN) يتم التحقق منها داخل الخدمة.
router.delete(
  '/:sessionId',
  authenticateToken,
  scheduledSessionController.deleteSession
);


// === المسارات المتداخلة تحت Branch (سيتم استخدامها من branchRoutes.js) ===
// مثال: /api/branches/:branchId/scheduled-sessions

// GET /api/branches/:branchId/scheduled-sessions - عرض جميع الجلسات لفرع معين
// تم تغطيتها بالفعل بواسطة GET '/' أعلاه عندما يتم تمرير branchId من خلال mergeParams
// router.get('/', scheduledSessionController.getAllSessions); // مكرر

// POST /api/branches/:branchId/scheduled-sessions - إنشاء جلسة جديدة لفرع معين
router.post(
  '/', // المسار هنا هو '/' لأنه سيكون نسبيًا للمسار الأصلي
  authenticateToken,
  // authorizeRoles('GYM_OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR'), // أدوار مقترحة
  scheduledSessionController.createSession
);

module.exports = router;
