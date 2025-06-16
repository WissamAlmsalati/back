const equipmentService = require('../services/equipmentService');

class EquipmentController {
  async createEquipment(req, res, next) {
    try {
      const { branchId } = req.params; // أو req.body.branchId
      const equipmentData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (!branchId) {
        return res.status(400).json({ message: 'Branch ID is required to add equipment.' });
      }
      // التحقق الأساسي من المدخلات موجود في الخدمة

      const newEquipment = await equipmentService.createEquipment(equipmentData, branchId, requestingUserId, userRole);
      res.status(201).json(newEquipment);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('must be a non-negative integer') || error.message.includes('Invalid purchase date format')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'Branch not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async getAllEquipment(req, res, next) {
    try {
      const { branchId } = req.query; // للفلترة حسب الفرع
      const equipmentList = await equipmentService.getAllEquipment(branchId);
      res.json(equipmentList);
    } catch (error) {
      next(error);
    }
  }

  async getEquipmentById(req, res, next) {
    try {
      const { equipmentId } = req.params;
      const equipment = await equipmentService.getEquipmentById(equipmentId);
      res.json(equipment);
    } catch (error) {
      if (error.message === 'Equipment not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  async updateEquipment(req, res, next) {
    try {
      const { equipmentId } = req.params;
      const equipmentData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (Object.keys(equipmentData).length === 0) {
        return res.status(400).json({ message: 'No data provided for update.' });
      }

      const updatedEquipment = await equipmentService.updateEquipment(equipmentId, equipmentData, requestingUserId, userRole);
      res.json(updatedEquipment);
    } catch (error) {
      if (error.message === 'Equipment not found' || error.message === 'New parent branch not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('required') || error.message.includes('must be a non-negative integer') || error.message.includes('Invalid purchase date format')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async deleteEquipment(req, res, next) {
    try {
      const { equipmentId } = req.params;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      const result = await equipmentService.deleteEquipment(equipmentId, requestingUserId, userRole);
      res.json(result);
    } catch (error)
{ // هذا القوس كان في غير مكانه في الاقتراح الأصلي، تم تصحيحه
      if (error.message === 'Equipment not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }
}

module.exports = new EquipmentController();
