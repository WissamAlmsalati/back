const trainingClassTypeService = require('../services/trainingClassTypeService');

class TrainingClassTypeController {
  async createClassType(req, res, next) {
    try {
      // gymId يمكن أن يأتي من req.params (إذا كان المسار متداخلاً) أو req.body (إذا كان اختياريًا)
      // هنا نفترض أنه يمكن أن يكون في req.params أو لا يكون موجودًا (لإنشاء نوع عام)
      const { gymId } = req.params;
      const classTypeData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      // إذا كان gymId مطلوبًا دائمًا عند الإنشاء عبر مسار معين، يمكن إضافة تحقق هنا
      // if (req.baseUrl.includes('/gyms/') && !gymId) {
      //   return res.status(400).json({ message: 'Gym ID is required for this route.' });
      // }

      const newClassType = await trainingClassTypeService.createClassType(classTypeData, gymId, requestingUserId, userRole);
      res.status(201).json(newClassType);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('must be a positive integer')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'Gym not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async getAllClassTypes(req, res, next) {
    try {
      // gymId للفلترة، includeGlobal لتحديد ما إذا كان يجب تضمين الأنواع العامة
      const { gymId } = req.params; // إذا كان المسار متداخلاً /gyms/:gymId/class-types
      const { includeGlobal = true } = req.query; // /class-types?includeGlobal=false

      let effectiveGymId = gymId;
      // إذا لم يكن gymId في params (مسار عام مثل /api/class-types) ولكن تم تمريره كـ query param
      if (!effectiveGymId && req.query.gymId) {
        effectiveGymId = req.query.gymId;
      }

      const classTypes = await trainingClassTypeService.getAllClassTypes(effectiveGymId, includeGlobal === 'true' || includeGlobal === true);
      res.json(classTypes);
    } catch (error) {
      next(error);
    }
  }

  async getClassTypeById(req, res, next) {
    try {
      const { classTypeId } = req.params;
      const classType = await trainingClassTypeService.getClassTypeById(classTypeId);
      res.json(classType);
    } catch (error) {
      if (error.message === 'Training class type not found') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  async updateClassType(req, res, next) {
    try {
      const { classTypeId } = req.params;
      const classTypeData = req.body;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      if (Object.keys(classTypeData).length === 0) {
        return res.status(400).json({ message: 'No data provided for update.' });
      }

      const updatedClassType = await trainingClassTypeService.updateClassType(classTypeId, classTypeData, requestingUserId, userRole);
      res.json(updatedClassType);
    } catch (error) {
      if (error.message === 'Training class type not found' || error.message === 'Gym not found' || error.message === 'Target gym for class type not found' || error.message === 'Associated gym not found for the class type.') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('must be a positive integer')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      next(error);
    }
  }

  async deleteClassType(req, res, next) {
    try {
      const { classTypeId } = req.params;
      const requestingUserId = req.user.id;
      const userRole = req.user.role;

      const result = await trainingClassTypeService.deleteClassType(classTypeId, requestingUserId, userRole);
      res.json(result);
    } catch (error) {
      if (error.message === 'Training class type not found' || error.message === 'Associated gym not found for the class type.') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.startsWith('Unauthorized')) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message.includes('Cannot delete class type: It is currently used in scheduled sessions')) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  }
}

module.exports = new TrainingClassTypeController();
