const { Booking, User, ScheduledSession, MemberSubscription, MembershipPlan, Branch, Gym, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

class BookingService {
  async createBooking(userId, sessionId, requestingUserId, userRole) {
    // 1. التحقق من المستخدم والجلسة
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    // المستخدم العادي يمكنه الحجز لنفسه فقط، إلا إذا كان SUPER_ADMIN أو GYM_OWNER/BRANCH_MANAGER للحجوزات ضمن نطاقهم
    if (userRole === 'MEMBER' && userId !== requestingUserId) {
      throw new Error('Unauthorized: Members can only create bookings for themselves.');
    }
    // (يمكن إضافة تحققات أكثر تفصيلاً للأدوار الأخرى لاحقًا إذا كانوا يحجزون نيابة عن المستخدمين)


    const session = await ScheduledSession.findByPk(sessionId, {
      include: [
        { model: Branch, as: 'branch', include: [{ model: Gym, as: 'gym' }] },
        { model: User, as: 'instructorUser', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });
    if (!session) {
      throw new Error('Scheduled session not found.');
    }

    // 2. التحقق من حالة الجلسة (يجب أن تكون ACTIVE أو UPCOMING)
    if (session.status !== 'ACTIVE' && session.status !== 'UPCOMING') { // افترض أن لديك هذه الحالات
        throw new Error(`Session is not available for booking (status: ${session.status}).`);
    }
    if (moment(session.startTime).isBefore(moment())) {
        throw new Error('Cannot book a session that has already started or passed.');
    }

    // 3. التحقق من وجود اشتراك فعال للمستخدم يغطي هذه الجلسة
    // هذا يعتمد على ما إذا كانت الجلسة مرتبطة بفرع/صالة معينة
    const requiredGymId = session.branch ? session.branch.gymId : null;
    const activeSubscription = await MemberSubscription.findOne({
      where: {
        userId: userId,
        status: 'ACTIVE',
        startDate: { [Op.lte]: session.startTime }, // يبدأ الاشتراك قبل أو في وقت الجلسة
        endDate: { [Op.gte]: session.startTime }    // ينتهي الاشتراك بعد أو في وقت الجلسة
      },
      include: [{ model: MembershipPlan, as: 'plan' }]
    });

    if (!activeSubscription) {
      throw new Error('No active and valid subscription found for this user and session timeframe.');
    }

    // تحقق مما إذا كانت الخطة تغطي الصالة الرياضية للجلسة
    if (requiredGymId && activeSubscription.plan.gymId !== null && activeSubscription.plan.gymId !== requiredGymId) {
      throw new Error(`Your current subscription plan (ID: ${activeSubscription.plan.id}) does not cover the gym (ID: ${requiredGymId}) for this session.`);
    }
    // إذا كانت الخطة عامة (gymId is null)، فهي تغطي جميع الصالات.

    // 4. التحقق من السعة المتاحة
    if (session.currentCapacityBooked >= session.maxCapacity) {
      throw new Error('Session is fully booked.');
    }

    // 5. التحقق مما إذا كان المستخدم قد حجز بالفعل في هذه الجلسة
    const existingBooking = await Booking.findOne({
      where: { userId, sessionId }
    });
    if (existingBooking && existingBooking.status !== 'CANCELLED_BY_USER' && existingBooking.status !== 'CANCELLED_BY_ADMIN') {
      throw new Error('User is already booked for this session.');
    }

    // 6. إنشاء الحجز وتحديث سعة الجلسة (داخل معاملة لضمان الاتساق)
    let newBooking;
    try {
      await sequelize.transaction(async (t) => {
        newBooking = await Booking.create({
          userId,
          sessionId,
          bookingDate: new Date(),
          status: 'CONFIRMED', // (CONFIRMED, CANCELLED_BY_USER, CANCELLED_BY_ADMIN, ATTENDED, NO_SHOW)
        }, { transaction: t });

        // زيادة currentCapacityBooked في ScheduledSession
        await session.increment('currentCapacityBooked', { transaction: t });
        // يمكنك أيضًا تحديث حالة الجلسة إلى 'FULL' إذا وصلت للحد الأقصى
        // if (session.currentCapacityBooked + 1 === session.maxCapacity) {
        //     session.status = 'FULL'; // أو أي حالة مناسبة
        //     await session.save({ transaction: t });
        // }
      });
    } catch (error) {
      // إذا حدث خطأ في المعاملة، تراجع عن أي تغييرات
      console.error('Transaction failed for booking:', error);
      throw new Error('Failed to create booking. Please try again.');
    }

    return Booking.findByPk(newBooking.id, { // إرجاع الحجز مع التفاصيل
        include: [
            {model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email']},
            {model: ScheduledSession, as: 'session', include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name']},
                { model: User, as: 'instructorUser', attributes: ['id', 'firstName', 'lastName'] }
            ]}
        ]
    });
  }

  async getBookingById(bookingId, requestingUserId, userRole) {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: ScheduledSession,
          as: 'session',
          include: [
            { model: User, as: 'instructorUser', attributes: ['id', 'firstName', 'lastName'] },
            { model: Branch, as: 'branch', include: [{ model: Gym, as: 'gym', attributes: ['id', 'name', 'ownerId'] }] }
          ]
        }
      ]
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    // التحقق من الصلاحيات
    if (userRole === 'SUPER_ADMIN') return booking;
    if (userRole === 'MEMBER' && booking.userId === requestingUserId) return booking;
    if (userRole === 'GYM_OWNER' && booking.session && booking.session.branch && booking.session.branch.gym && booking.session.branch.gym.ownerId === requestingUserId) return booking;
    // يمكن إضافة صلاحيات لـ BRANCH_MANAGER و INSTRUCTOR لرؤية حجوزات جلساتهم/فروعهم

    throw new Error('Unauthorized to view this booking.');
  }

  async getAllBookings(filters, requestingUserId, userRole) {
    const { userId, sessionId, branchId, gymId, status, dateFrom, dateTo } = filters;
    const whereClause = {};
    const sessionWhereClause = {};
    const branchWhereClause = {};
    // const gymWhereClause = {}; // تم الحذف

    if (status) whereClause.status = status;
    if (userId) {
        if (userRole === 'MEMBER' && parseInt(userId) !== requestingUserId) {
            throw new Error('Unauthorized: Members can only view their own bookings.');
        }
        whereClause.userId = userId;
    } else if (userRole === 'MEMBER') {
        whereClause.userId = requestingUserId;
    }

    if (sessionId) whereClause.sessionId = sessionId;
    if (dateFrom) whereClause.bookingDate = { ...whereClause.bookingDate, [Op.gte]: moment(dateFrom).startOf('day').toDate() };
    if (dateTo) whereClause.bookingDate = { ...whereClause.bookingDate, [Op.lte]: moment(dateTo).endOf('day').toDate() };

    if (branchId) sessionWhereClause.branchId = branchId;
    if (gymId) branchWhereClause.gymId = gymId;

    if (userRole === 'GYM_OWNER') {
        const userGyms = await Gym.findAll({ where: { ownerId: requestingUserId }, attributes: ['id'] });
        const userGymIds = userGyms.map(g => g.id);
        if (userGymIds.length === 0 && !gymId) return [];

        if (gymId) {
            if (!userGymIds.includes(parseInt(gymId))) {
                 throw new Error('Unauthorized: You can only view bookings for gyms you own.');
            }
            branchWhereClause.gymId = gymId;
        } else {
            branchWhereClause.gymId = { [Op.in]: userGymIds };
        }
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: ScheduledSession,
          as: 'session',
          where: Object.keys(sessionWhereClause).length > 0 ? sessionWhereClause : undefined,
          include: [
            { model: User, as: 'instructorUser', attributes: ['id', 'firstName', 'lastName'] },
            {
              model: Branch,
              as: 'branch',
              where: Object.keys(branchWhereClause).length > 0 ? branchWhereClause : undefined,
              include: [{ model: Gym, as: 'gym', attributes: ['id', 'name', 'ownerId'] }]
            }
          ]
        }
      ],
      order: [['bookingDate', 'DESC']],
    });
    return bookings;
  }

  async cancelBooking(bookingId, cancellingUserId, cancellingUserRole, reason = "Cancelled by user") {
    const booking = await Booking.findByPk(bookingId, {
        include: [{model: ScheduledSession, as: 'session'}]
    });
    if (!booking) {
      throw new Error('Booking not found.');
    }

    let canCancel = false;
    if (cancellingUserRole === 'SUPER_ADMIN') canCancel = true;
    if (booking.userId === cancellingUserId) canCancel = true; 
    if (!canCancel && cancellingUserRole === 'GYM_OWNER') {
        const sessionDetails = await ScheduledSession.findByPk(booking.sessionId, {
            include: [{ model: Branch, as: 'branch', include: [{ model: Gym, as: 'gym' }] }]
        });
        if (sessionDetails && sessionDetails.branch && sessionDetails.branch.gym && sessionDetails.branch.gym.ownerId === cancellingUserId) {
            canCancel = true;
        }
    }

    if (!canCancel) {
      throw new Error('Unauthorized to cancel this booking.');
    }

    if (moment(booking.session.startTime).isBefore(moment())) {
        throw new Error('Cannot cancel booking for a session that has already started or passed.');
    }

    if (booking.status === 'CANCELLED_BY_USER' || booking.status === 'CANCELLED_BY_ADMIN') {
        return booking; 
    }

    try {
      await sequelize.transaction(async (t) => {
        booking.status = cancellingUserId === booking.userId ? 'CANCELLED_BY_USER' : 'CANCELLED_BY_ADMIN';
        // booking.cancellationReason = reason; // يمكنك الاحتفاظ بهذا إذا أضفت الحقل
        await booking.save({ transaction: t });

        const session = await ScheduledSession.findByPk(booking.sessionId, { transaction: t });
        if (session && session.currentCapacityBooked > 0) {
          await session.decrement('currentCapacityBooked', { transaction: t });
        }
      });
    } catch (error) {
      console.error('Transaction failed for booking cancellation:', error);
      throw new Error('Failed to cancel booking. Please try again.');
    }
    return booking;
  }

  // يمكن إضافة وظائف أخرى مثل:
  // - markAsAttended(bookingId)
  // - markAsNoShow(bookingId)
}

module.exports = BookingService;
