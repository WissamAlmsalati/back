const membershipPlanService = require('../services/membershipPlanService');

class MembershipPlanController {
  async createPlan(req, res, next) {
    try {
      const { gymId } = req.params; // أو req.body.gymId
      const planData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (!gymId) {
        return res.status(400).json({ message: 'Gym ID is required to create a plan.' });
      }
      // التحقق الأساسي من المدخلات موجود في الخدمة، يمكن إضافة المزيد هنا إذا لزم الأمر

      const newPlan = await membershipPlanService.createPlan(planData, gymId, requestingUserId, userRole);
      res.status(201).json(newPlan);
    } catch (error) {
      // معالجة الأخطاء الشائعة من الخدمة
      if (error.message.includes('required') || error.message.includes('must be a non-negative number') || error.message.includes('must be a positive integer')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'Gym not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error); // للأخطاء الأخرى
    }
  }

  async getAllPlans(req, res, next) {
    try {
      const { gymId } = req.query; // للفلترة حسب الصالة
      const plans = await membershipPlanService.getAllPlans(gymId);
      res.json(plans);
    } catch (error) {
      next(error);
    }
  }

  async getPlanById(req, res, next) {
    try {
      const { planId } = req.params;
      const plan = await membershipPlanService.getPlanById(planId);
      res.json(plan);
    } catch (error) {
      if (error.message === 'Membership plan not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const { planId } = req.params;
      const planData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (Object.keys(planData).length === 0) {
        return res.status(400).json({ message: 'No data provided for update.' });
      }

      const updatedPlan = await membershipPlanService.updatePlan(planId, planData, requestingUserId, userRole);
      res.json(updatedPlan);
    } catch (error) {
      if (error.message === 'Membership plan not found' || error.message === 'New parent gym not found') {
        return res.status(404).json({ message: error.message });
      }
       if (error.message.includes('required') || error.message.includes('must be a non-negative number') || error.message.includes('must be a positive integer')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async deletePlan(req, res, next) {
    try {
      const { planId } = req.params;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      const result = await membershipPlanService.deletePlan(planId, requestingUserId, userRole);
      res.json(result);
    } catch (error) {
      if (error.message === 'Membership plan not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      // لاحقًا: if (error.message.includes('active subscriptions')) { return res.status(400).json({ message: error.message }); }
      next(error);
    }
  }
}

module.exports = new MembershipPlanController();
