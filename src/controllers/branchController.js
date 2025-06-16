const branchService = require('../services/branchService');

class BranchController {
  async createBranch(req, res, next) {
    try {
      const { gymId } = req.params; // أو req.body.gymId إذا كنت تفضل تمريره في الجسم
      const branchData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (!branchData.name) {
        return res.status(400).json({ message: 'Branch name is required' });
      }
      if (!gymId) {
          return res.status(400).json({ message: 'Gym ID is required to create a branch' });
      }
      // يمكنك إضافة المزيد من التحقق من صحة المدخلات هنا

      const newBranch = await branchService.createBranch(branchData, gymId, requestingUserId, userRole);
      res.status(201).json(newBranch);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('Gym not found') || error.message.startsWith('Unauthorized')) {
        return res.status(400).json({ message: error.message }); // 400 or 403 for Unauthorized, 404 for Gym not found
      }
      next(error);
    }
  }

  async getAllBranches(req, res, next) {
    try {
      const { gymId } = req.query; // للسماح بالفلترة حسب الصالة الرياضية
      const branches = await branchService.getAllBranches(gymId);
      res.json(branches);
    } catch (error) {
      next(error);
    }
  }

  async getBranchById(req, res, next) {
    try {
      const { branchId } = req.params; // تم تغيير الاسم ليكون أوضح
      const branch = await branchService.getBranchById(branchId);
      res.json(branch);
    } catch (error) {
      if (error.message === 'Branch not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  async updateBranch(req, res, next) {
    try {
      const { branchId } = req.params;
      const branchData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (Object.keys(branchData).length === 0) {
        return res.status(400).json({ message: 'No data provided for update.' });
      }

      const updatedBranch = await branchService.updateBranch(branchId, branchData, requestingUserId, userRole);
      res.json(updatedBranch);
    } catch (error) {
      if (error.message === 'Branch not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized') || error.message.includes('already exists') || error.message.includes('New parent gym not found')) {
        return res.status(400).json({ message: error.message }); // أو 403
      }
      next(error);
    }
  }

  async deleteBranch(req, res, next) {
    try {
      const { branchId } = req.params;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      const result = await branchService.deleteBranch(branchId, requestingUserId, userRole);
      res.json(result);
    } catch (error) {
      if (error.message === 'Branch not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }
}

module.exports = new BranchController();
