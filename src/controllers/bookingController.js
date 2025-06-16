const bookingService = require('../services/bookingService');

class BookingController {
  async createBooking(req, res, next) {
    try {
      // userId يمكن أن يأتي من req.params (للمسار المتداخل /users/:userId/bookings)
      // أو من req.user.id إذا كان المستخدم يحجز لنفسه عبر مسار عام
      // sessionId يمكن أن يأتي من req.params (للمسار المتداخل /sessions/:sessionId/bookings)
      // أو من req.body إذا كان الحجز يتم عبر مسار عام
      const targetUserId = req.params.userId || req.user.id; // الأولوية لـ params إذا كان admin يحجز لمستخدم
      const sessionId = req.params.sessionId || req.body.sessionId;

      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (!targetUserId || !sessionId) {
        return res.status(400).json({ message: 'User ID and Session ID are required.' });
      }

      const newBooking = await bookingService.createBooking(
        parseInt(targetUserId),
        parseInt(sessionId),
        requestingUserId,
        userRole
      );
      res.status(201).json(newBooking);
    } catch (error) {
      // معالجة الأخطاء الشائعة من الخدمة
      if (error.message.includes('not found') || error.message.includes('fully booked') || error.message.includes('already booked') || error.message.includes('not available for booking') || error.message.includes('Cannot book a session') || error.message.includes('No active and valid subscription') || error.message.includes('does not cover the gym')) {
        return res.status(404).json({ message: error.message }); // أو 400/409 حسب الحالة
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message.includes('Failed to create booking')) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const { bookingId } = req.params;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;
      const booking = await bookingService.getBookingById(parseInt(bookingId), requestingUserId, userRole);
      res.json(booking);
    } catch (error) {
      if (error.message === 'Booking not found.') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async getAllBookings(req, res, next) {
    try {
      const filters = { ...req.query };
      // إذا كان المسار متداخلاً، أضف userId أو sessionId إلى الفلاتر
      if (req.params.userId) filters.userId = req.params.userId;
      if (req.params.sessionId) filters.sessionId = req.params.sessionId;

      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      const bookings = await bookingService.getAllBookings(filters, requestingUserId, userRole);
      res.json(bookings);
    } catch (error) {
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body; // سبب الإلغاء (اختياري)
      const cancellingUserId = req.user.id;
      const cancellingUserRole = req.user.role;

      const cancelledBooking = await bookingService.cancelBooking(
        parseInt(bookingId),
        cancellingUserId,
        cancellingUserRole,
        reason
      );
      res.json(cancelledBooking);
    } catch (error) {
      if (error.message === 'Booking not found.' || error.message.includes('Cannot cancel booking')) {
        return res.status(error.message === 'Booking not found.' ? 404 : 400).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message.includes('Failed to cancel booking')) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  }

  // يمكن إضافة دوال لتحديث حالة الحجز (Attended, NoShow) لاحقًا
  // async markBookingAttended(req, res, next) { ... }
  // async markBookingNoShow(req, res, next) { ... }
}

module.exports = new BookingController();
