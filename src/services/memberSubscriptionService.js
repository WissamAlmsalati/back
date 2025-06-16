const { MemberSubscription, User, MembershipPlan, Gym } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment'); // لاستخدام moment.js للتعامل مع التواريخ

class MemberSubscriptionService {
  async createSubscription(userId, planId, startDateString, paymentTransactionId, requestingUserId, userRole) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found.');
    }
    // لا يمكن للمستخدم العادي إنشاء اشتراك لمستخدم آخر إلا إذا كان SUPER_ADMIN
    if (userRole !== 'SUPER_ADMIN' && requestingUserId !== userId) {
        throw new Error('Unauthorized: You can only create subscriptions for yourself unless you are a Super Admin.');
    }

    const plan = await MembershipPlan.findByPk(planId);
    if (!plan) {
      throw new Error('Membership plan not found.');
    }

    const startDate = moment(startDateString).startOf('day');
    if (!startDate.isValid()) {
      throw new Error('Invalid start date format.');
    }

    // تحقق من وجود اشتراك فعال حالي لنفس الخطة أو لنفس الصالة (إذا كانت الخطة مرتبطة بصالة)
    // هذه قاعدة عمل اختيارية، يمكن تعديلها
    const existingActiveSubscription = await MemberSubscription.findOne({
      where: {
        userId,
        status: 'ACTIVE',
        // planId: planId, // يمكن إضافة هذا الشرط إذا كنت لا تريد خططًا متعددة نشطة
      },
      include: [{ model: MembershipPlan, as: 'plan' }]
    });

    if (existingActiveSubscription) {
        if (existingActiveSubscription.plan.gymId === plan.gymId || (existingActiveSubscription.plan.gymId === null && plan.gymId === null)) {
             throw new Error('User already has an active subscription for this gym or a global plan. Please manage the existing subscription.');
        }
    }


    let endDate;
    if (plan.durationDays) {
      endDate = moment(startDate).add(plan.durationDays, 'days').endOf('day');
    } else {
      // إذا لم تكن هناك مدة محددة، افترض أنها لا تنتهي أو تحتاج إلى منطق آخر
      // هنا سنجعلها سنة واحدة كافتراضي إذا لم تكن durationDays موجودة
      endDate = moment(startDate).add(1, 'year').endOf('day');
      // أو throw new Error('Plan duration is not defined.');
    }

    const newSubscription = await MemberSubscription.create({
      userId,
      planId,
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
      status: 'ACTIVE', // (ACTIVE, EXPIRED, CANCELLED, PENDING_PAYMENT)
      paymentTransactionId: paymentTransactionId || null,
      // gymId: plan.gymId, // يمكن إضافته لتسهيل الاستعلامات لاحقًا
    });
    return newSubscription;
  }

  async getSubscriptionById(subscriptionId, requestingUserId, userRole) {
    const subscription = await MemberSubscription.findByPk(subscriptionId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: MembershipPlan, as: 'plan', include: [{model: Gym, as: 'gym', attributes: ['id', 'name']}] }
      ]
    });
    if (!subscription) {
      throw new Error('Subscription not found.');
    }

    // SUPER_ADMIN يمكنه رؤية أي اشتراك
    // المستخدم يمكنه رؤية اشتراكاته فقط
    // مالك الصالة يمكنه رؤية الاشتراكات المتعلقة بصالة رياضية يملكها
    if (userRole === 'SUPER_ADMIN') {
        return subscription;
    }
    if (subscription.userId === requestingUserId) {
        return subscription;
    }
    if (userRole === 'GYM_OWNER' && subscription.plan && subscription.plan.gym && subscription.plan.gym.ownerId === requestingUserId) {
        return subscription;
    }

    throw new Error('Unauthorized: You do not have permission to view this subscription.');
  }

  async getAllSubscriptions(filters, requestingUserId, userRole) {
    const { userId, planId, gymId, status, startDateFrom, startDateTo, endDateFrom, endDateTo } = filters;
    const whereClause = {};
    const planWhereClause = {};

    if (status) whereClause.status = status;
    if (userId) { // إذا كان المستخدم العادي يطلب، يجب أن يكون userId هو نفسه
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'GYM_OWNER' && parseInt(userId) !== requestingUserId) {
            throw new Error('Unauthorized: You can only view your own subscriptions.');
        }
        whereClause.userId = userId;
    }

    if (planId) whereClause.planId = planId;

    if (startDateFrom) whereClause.startDate = { ...whereClause.startDate, [Op.gte]: moment(startDateFrom).startOf('day').toDate() };
    if (startDateTo) whereClause.startDate = { ...whereClause.startDate, [Op.lte]: moment(startDateTo).endOf('day').toDate() };
    if (endDateFrom) whereClause.endDate = { ...whereClause.endDate, [Op.gte]: moment(endDateFrom).startOf('day').toDate() };
    if (endDateTo) whereClause.endDate = { ...whereClause.endDate, [Op.lte]: moment(endDateTo).endOf('day').toDate() };

    if (gymId) {
        planWhereClause.gymId = gymId;
        // إذا كان مالك الصالة يطلب، تأكد أنه يطلب لصالة يملكها
        if (userRole === 'GYM_OWNER') {
            const gym = await Gym.findByPk(gymId);
            if (!gym || gym.ownerId !== requestingUserId) {
                throw new Error('Unauthorized: You can only view subscriptions for gyms you own.');
            }
        }
    } else if (userRole === 'GYM_OWNER') {
        // إذا كان مالك الصالة ولم يحدد gymId، أظهر له الاشتراكات لجميع صالاته
        const userGyms = await Gym.findAll({ where: { ownerId: requestingUserId }, attributes: ['id'] });
        const userGymIds = userGyms.map(g => g.id);
        if (userGymIds.length === 0) return []; // لا يملك أي صالات
        planWhereClause.gymId = { [Op.in]: userGymIds };
    }


    const subscriptions = await MemberSubscription.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] },
        {
          model: MembershipPlan,
          as: 'plan',
          where: Object.keys(planWhereClause).length > 0 ? planWhereClause : undefined,
          include: [{ model: Gym, as: 'gym', attributes: ['id', 'name'] /*where: gymWhereClause*/ }]
        }
      ],
      order: [['startDate', 'DESC']],
    });

    // إذا لم يكن المستخدم SUPER_ADMIN ولا مالك صالة، فلتر إضافي للتأكد أنه يرى اشتراكاته فقط
    // هذا ضروري إذا لم يتم تمرير userId في الفلاتر من البداية
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'GYM_OWNER') {
        return subscriptions.filter(sub => sub.userId === requestingUserId);
    }

    return subscriptions;
  }

  async updateSubscriptionStatus(subscriptionId, newStatus, reason, requestingUserId, userRole) {
    const subscription = await this.getSubscriptionById(subscriptionId, requestingUserId, userRole); // يتضمن التحقق من الصلاحية

    // منطق إضافي للتحقق من الصلاحية لتغيير الحالة
    // مثال: فقط SUPER_ADMIN أو مالك الصالة (إذا كانت الخطة تابعة للصالة) يمكنهم الإلغاء
    if (newStatus === 'CANCELLED') {
        let canCancel = false;
        if (userRole === 'SUPER_ADMIN') canCancel = true;
        if (userRole === 'GYM_OWNER' && subscription.plan && subscription.plan.gym && subscription.plan.gym.ownerId === requestingUserId) canCancel = true;
        // المستخدم يمكنه إلغاء اشتراكه الخاص (قد تحتاج إلى شروط إضافية)
        if (subscription.userId === requestingUserId && subscription.status === 'ACTIVE') canCancel = true;


        if (!canCancel) {
            throw new Error('Unauthorized: You do not have permission to cancel this subscription.');
        }
    }
    // يمكن إضافة المزيد من التحققات لأنواع الحالات الأخرى

    const validStatuses = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT', 'FROZEN'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid subscription status.');
    }

    subscription.status = newStatus;
    // يمكن إضافة حقل لتسجيل سبب التغيير
    // subscription.statusChangeReason = reason;
    await subscription.save();
    return subscription;
  }

  // وظيفة للتحقق من الاشتراكات المنتهية وتحديث حالتها (يمكن تشغيلها كـ cron job)
  static async checkAndUpdateExpiredSubscriptions() {
    const today = moment().startOf('day').toDate();
    const expiredSubscriptions = await MemberSubscription.update(
      { status: 'EXPIRED' },
      {
        where: {
          endDate: { [Op.lt]: today },
          status: 'ACTIVE'
        }
      }
    );
    console.log(`${expiredSubscriptions[0]} subscriptions updated to EXPIRED.`);
    return expiredSubscriptions[0];
  }
}

module.exports = MemberSubscriptionService;
