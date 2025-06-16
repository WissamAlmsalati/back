const { MembershipPlan, Gym, User } = require('../models'); // استيراد النماذج اللازمة

class MembershipPlanService {
  async createPlan(planData, gymId, requestingUserId, userRole) {
    const { name, description, price, durationDays, features, isActive } = planData;

    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      throw new Error('Gym not found');
    }

    // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنهم إضافة خطة
    if (userRole !== 'SUPER_ADMIN' && gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not own this gym to add a membership plan.');
    }

    if (!name || price === undefined || durationDays === undefined) {
        throw new Error('Name, price, and durationDays are required for a membership plan.');
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        throw new Error('Price must be a non-negative number.');
    }
    if (isNaN(parseInt(durationDays)) || parseInt(durationDays) <= 0) {
        throw new Error('DurationDays must be a positive integer.');
    }

    try {
      const newPlan = await MembershipPlan.create({
        gymId,
        name,
        description,
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
        features: features || {}, // يمكن أن يكون JSON
        isActive: isActive !== undefined ? isActive : true // افتراضيًا تكون الخطة نشطة
      });
      return newPlan;
    } catch (error) {
      // يمكنك إضافة معالجة لأخطاء Sequelize الأخرى هنا
      throw error;
    }
  }

  async getAllPlans(gymId = null) {
    const queryOptions = {
      include: [
        { model: Gym, as: 'gym', attributes: ['id', 'name'] }
      ]
    };
    if (gymId) {
      queryOptions.where = { gymId };
    }
    const plans = await MembershipPlan.findAll(queryOptions);
    return plans;
  }

  async getPlanById(planId) {
    const plan = await MembershipPlan.findByPk(planId, {
      include: [
        { model: Gym, as: 'gym', include: [{model: User, as: 'owner', attributes: ['id', 'email']}] }
      ]
    });
    if (!plan) {
      throw new Error('Membership plan not found');
    }
    return plan;
  }

  async updatePlan(planId, planData, requestingUserId, userRole) {
    const plan = await this.getPlanById(planId); // يتضمن التحقق من وجود الخطة

    // التحقق من الصلاحيات: فقط مالك الصالة (التي تتبع لها الخطة) أو SUPER_ADMIN يمكنهم التعديل
    if (userRole !== 'SUPER_ADMIN' && plan.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to update this membership plan.');
    }

    const { name, description, price, durationDays, features, isActive, gymId } = planData;

    // منع تغيير gymId للخطة إلا بواسطة SUPER_ADMIN (أو قد تقرر منعه تمامًا)
    if (gymId && gymId !== plan.gymId && userRole !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized: Only SUPER_ADMIN can change the plan\'s parent gym.');
    }
    if (gymId && gymId !== plan.gymId) { // إذا كان SUPER_ADMIN يغير الصالة
        const newGym = await Gym.findByPk(gymId);
        if (!newGym) throw new Error('New parent gym not found.');
    }
    if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
        throw new Error('Price must be a non-negative number.');
    }
    if (durationDays !== undefined && (isNaN(parseInt(durationDays)) || parseInt(durationDays) <= 0)) {
        throw new Error('DurationDays must be a positive integer.');
    }

    try {
      const updatedPlan = await plan.update({
        name: name !== undefined ? name : plan.name,
        description: description !== undefined ? description : plan.description,
        price: price !== undefined ? parseFloat(price) : plan.price,
        durationDays: durationDays !== undefined ? parseInt(durationDays) : plan.durationDays,
        features: features !== undefined ? features : plan.features,
        isActive: isActive !== undefined ? isActive : plan.isActive,
        gymId: gymId && userRole === 'SUPER_ADMIN' ? gymId : plan.gymId,
      });
      return updatedPlan;
    } catch (error) {
      throw error;
    }
  }

  async deletePlan(planId, requestingUserId, userRole) {
    const plan = await this.getPlanById(planId); // يتضمن التحقق من وجود الخطة

    // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنهم الحذف
    if (userRole !== 'SUPER_ADMIN' && plan.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to delete this membership plan.');
    }

    // لاحقًا: تحقق مما إذا كانت هناك اشتراكات نشطة لهذه الخطة قبل الحذف
    // const activeSubscriptions = await MemberSubscription.count({ where: { planId, isActive: true } });
    // if (activeSubscriptions > 0) {
    //   throw new Error('Cannot delete plan with active subscriptions. Please deactivate subscriptions first or deactivate the plan.');
    // }

    await plan.destroy();
    return { message: 'Membership plan deleted successfully' };
  }
}

module.exports = new MembershipPlanService();
