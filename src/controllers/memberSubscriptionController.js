const memberSubscriptionService = require('../services/memberSubscriptionService');

class MemberSubscriptionController {
  async createSubscription(req, res, next) {
    try {
      // userId يمكن أن يأتي من req.params (للمسار المتداخل /users/:userId/subscriptions)
      // أو من req.body إذا كان الإنشاء يتم بواسطة admin لمستخدم آخر عبر مسار عام
      const targetUserId = req.params.userId || req.body.userId;
      const { planId, startDate, paymentTransactionId } = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (!targetUserId || !planId || !startDate) {
        return res.status(400).json({ message: 'User ID, Plan ID, and Start Date are required.' });
      }

      const newSubscription = await memberSubscriptionService.createSubscription(
        parseInt(targetUserId),
        parseInt(planId),
        startDate,
        paymentTransactionId,
        requestingUserId,
        userRole
      );
      res.status(201).json(newSubscription);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('already has an active subscription')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async getSubscriptionById(req, res, next) {
    try {
      const { subscriptionId } = req.params;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;
      const subscription = await memberSubscriptionService.getSubscriptionById(parseInt(subscriptionId), requestingUserId, userRole);
      res.json(subscription);
    } catch (error) {
      if (error.message === 'Subscription not found.') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async getAllSubscriptions(req, res, next) {
    try {
      // الفلاتر يمكن أن تأتي من req.query أو req.params
      const filters = { ...req.query };
      if (req.params.userId) { // للمسار المتداخل /users/:userId/subscriptions
        filters.userId = req.params.userId;
      }
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      const subscriptions = await memberSubscriptionService.getAllSubscriptions(filters, requestingUserId, userRole);
      res.json(subscriptions);
    } catch (error) {
       if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async updateSubscriptionStatus(req, res, next) {
    try {
      const { subscriptionId } = req.params;
      const { status, reason } = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (!status) {
        return res.status(400).json({ message: 'New status is required.' });
      }

      const updatedSubscription = await memberSubscriptionService.updateSubscriptionStatus(
        parseInt(subscriptionId),
        status,
        reason,
        requestingUserId,
        userRole
      );
      res.json(updatedSubscription);
    } catch (error) {
      if (error.message === 'Subscription not found.') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized') || error.message === 'Invalid subscription status.') {
        return res.status(error.message.startsWith('Unauthorized') ? 403 : 400).json({ message: error.message });
      }
      next(error);
    }
  }

  // يمكن إضافة دالة لتشغيل checkAndUpdateExpiredSubscriptions يدويًا إذا لزم الأمر
  async runCheckExpired(req, res, next) {
    try {
        // حماية هذا المسار لـ SUPER_ADMIN فقط
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const count = await memberSubscriptionService.constructor.checkAndUpdateExpiredSubscriptions();
        res.json({ message: `${count} subscriptions checked and updated.` });
    } catch (error) {
        next(error);
    }
  }
}

module.exports = new MemberSubscriptionController();
