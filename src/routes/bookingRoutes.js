const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Router لـ Booking
// mergeParams مهم للمسارات المتداخلة من userRoutes و scheduledSessionRoutes
const router = express.Router({ mergeParams: true });

// === المسارات العامة لـ Booking (يمكن الوصول إليها عبر /api/bookings) ===

// POST /api/bookings - إنشاء حجز جديد
// يتطلب sessionId في req.body. userId يؤخذ من req.user.id (المستخدم يحجز لنفسه)
// أو يمكن تمرير userId في req.body إذا كان admin يحجز لمستخدم (يتطلب صلاحيات أعلى)
router.post('/', authenticateToken, bookingController.createBooking);

// GET /api/bookings - عرض جميع الحجوزات (مع فلترة حسب الصلاحيات)
// يمكن استخدام query params مثل ?userId=1&sessionId=2&status=CONFIRMED
router.get('/', authenticateToken, bookingController.getAllBookings);

// GET /api/bookings/:bookingId - عرض تفاصيل حجز معين
router.get('/:bookingId', authenticateToken, bookingController.getBookingById);

// PUT /api/bookings/:bookingId/cancel - إلغاء حجز معين
router.put('/:bookingId/cancel', authenticateToken, bookingController.cancelBooking);

// (مسارات مستقبلية محتملة)
// PUT /api/bookings/:bookingId/attend - تحديد الحجز كـ "حضر" (للأدمن/المدرب)
// router.put('/:bookingId/attend', authenticateToken, authorizeRoles(['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'INSTRUCTOR']), bookingController.markBookingAttended);

// PUT /api/bookings/:bookingId/no-show - تحديد الحجز كـ "لم يحضر" (للأدمن/المدرب)
// router.put('/:bookingId/no-show', authenticateToken, authorizeRoles(['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'INSTRUCTOR']), bookingController.markBookingNoShow);


// === المسارات المتداخلة (سيتم استخدامها من userRoutes.js و scheduledSessionRoutes.js) ===
// المتحكم bookingController.createBooking و bookingController.getAllBookings يعالجان بالفعل
// req.params.userId و req.params.sessionId عند استدعائهما من مسارات متداخلة.

// مثال: POST /api/users/:userId/bookings (لإنشاء حجز لمستخدم معين)
// المتحكم سيأخذ userId من req.params.userId
// ويتوقع sessionId من req.body

// مثال: GET /api/users/:userId/bookings (لعرض حجوزات مستخدم معين)
// المتحكم سيأخذ userId من req.params.userId

// مثال: POST /api/scheduled-sessions/:sessionId/bookings (لإنشاء حجز لجلسة معينة)
// المتحكم سيأخذ sessionId من req.params.sessionId
// ويتوقع userId من req.body (أو req.user.id)

// مثال: GET /api/scheduled-sessions/:sessionId/bookings (لعرض حجوزات جلسة معينة)
// المتحكم سيأخذ sessionId من req.params.sessionId

module.exports = router;
