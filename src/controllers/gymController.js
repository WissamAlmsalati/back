const { Gym, User } = require('../models');
const gymService = require('../services/gymService');

class GymController {
  async createGym(req, res, next) {
    try {
      // 1. التحقق من أن req.body ليس فارغًا تمامًا أو undefined
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
          message: 'Request body cannot be empty.',
          missingFields: ['name', 'address', 'phoneNumber', 'email'] // إرجاع جميع الحقول المطلوبة كـ "مفقودة"
        });
      }

      const { name, address, phoneNumber, email, website } = req.body;
      const ownerId = req.user.id;

      // 2. التحقق من الحقول المطلوبة
      const requiredFields = {
        name: "Gym name",
        address: "Gym address",
        phoneNumber: "Gym phone number",
        email: "Gym email address"
      };
      const missingFieldsData = [];
      const invalidFieldsData = [];

      for (const fieldKey in requiredFields) {
        if (!req.body[fieldKey] || String(req.body[fieldKey]).trim() === '') {
          missingFieldsData.push(requiredFields[fieldKey]);
        }
      }

      if (missingFieldsData.length > 0) {
        return res.status(400).json({
          message: 'Missing required fields.',
          fields: missingFieldsData.map(fieldName => ({ 
            field: fieldName.toLowerCase().replace(/\s+/g, ''), // e.g., gymname
            message: `${fieldName} is required.` 
          }))
        });
      }

      // 3. تدقيقات إضافية لتنسيق الحقول إذا كانت موجودة
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        invalidFieldsData.push({ field: 'email', message: 'Invalid email format.' });
      }
      // مثال للتحقق من رقم الهاتف (بسيط جدًا)
      // const phoneRegex = /^\d{10,}$/;
      // if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      //   invalidFieldsData.push({ field: 'phoneNumber', message: 'Invalid phone number format. Must be at least 10 digits.'});
      // }

      if (invalidFieldsData.length > 0) {
        return res.status(400).json({
          message: 'Invalid field formats.',
          fields: invalidFieldsData
        });
      }

      // التحقق من أن المستخدم هو GYM_OWNER (أو SUPER_ADMIN إذا سمحت بذلك)
      if (req.user.role !== 'GYM_OWNER' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'You are not authorized to create a gym.' });
      }

      // إذا كان GYM_OWNER، تحقق مما إذا كان لديه بالفعل صالة رياضية مرتبطة به
      if (req.user.role === 'GYM_OWNER' && req.user.gymId) {
        const existingGym = await Gym.findOne({ where: { ownerId: ownerId, id: req.user.gymId } });
        if (existingGym) {
          return res.status(400).json({ message: 'You already own a gym. Cannot create another one.' });
        }
      }
      
      const newGym = await Gym.create({
        name,
        address,
        phoneNumber,
        email,
        website,
        ownerId: ownerId, 
        isActive: true 
      });

      if (req.user.role === 'GYM_OWNER' && !req.user.gymId) {
        await User.update({ gymId: newGym.id }, { where: { id: ownerId } });
        // req.user.gymId = newGym.id; // Update req.user for current request if needed elsewhere
      }

      res.status(201).json({ message: 'Gym created successfully', gym: newGym });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          message: 'Validation error from database.', 
          details: error.errors.map(e => ({field: e.path, message: e.message})) 
        });
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ 
          message: 'Conflict: Gym with some unique field (e.g., name or email) already exists.', 
          details: error.errors.map(e => ({field: e.path, message: e.message})) 
        });
      }
      console.error('Error creating gym:', error);
      next(error);
    }
  }

  async getAllGyms(req, res, next) {
    try {
      const gyms = await Gym.findAll({
        include: [
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ]
      });
      res.json(gyms);
    } catch (error) {
      console.error('Error fetching gyms:', error);
      next(error);
    }
  }

  async getGymById(req, res, next) {
    try {
      const gymId = req.params.id;
      const gym = await Gym.findByPk(gymId, {
        include: [
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
          // يمكنك إضافة نماذج أخرى ذات صلة هنا، مثل الفروع (Branches) أو خطط العضوية (MembershipPlans)
          // { model: Branch, as: 'branches' }
        ]
      });

      if (!gym) {
        return res.status(404).json({ message: 'Gym not found' });
      }

      // التحقق من الصلاحيات: هل المستخدم الحالي هو مالك هذه الصالة أو SUPER_ADMIN؟
      // أو هل هو موظف في هذه الصالة؟ (هذا يعتمد على منطق عملك)
      const canView = req.user.role === 'SUPER_ADMIN' || 
                      (req.user.role === 'GYM_OWNER' && gym.ownerId === req.user.id) ||
                      (req.user.gymId === gym.id); // إذا كان الموظف ينتمي إلى هذه الصالة

      if (!canView && req.user.role !== 'ADMIN_STAFF') { // ADMIN_STAFF قد يكون لديه صلاحيات أوسع
        // إذا كان ADMIN_STAFF، قد ترغب في السماح له برؤية جميع الصالات أو صالات معينة
        // هذا مجرد مثال، يجب تعديل منطق الصلاحيات ليناسب احتياجاتك
        // if (req.user.role === 'ADMIN_STAFF' && !someConditionForAdminStaffToView(gym)) {
        //   return res.status(403).json({ message: 'You are not authorized to view this gym' });
        // }
        // For now, let's assume non-owner/non-superadmin/non-staff cannot view
        // return res.status(403).json({ message: 'You are not authorized to view this gym' });
      }

      res.json(gym);
    } catch (error) {
      console.error('Error fetching gym by id:', error);
      next(error);
    }
  }

  async updateGym(req, res, next) {
    try {
      const gymId = req.params.id;
      const { name, address, phoneNumber, email, website, isActive } = req.body;

      const gym = await Gym.findByPk(gymId);
      if (!gym) {
        return res.status(404).json({ message: 'Gym not found' });
      }

      // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنه التعديل
      if (req.user.role !== 'SUPER_ADMIN' && gym.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'You are not authorized to update this gym' });
      }

      // التحقق من أن الجسم ليس فارغًا إذا كان هناك شيء للتحديث
      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'Request body cannot be empty for update.' });
      }

      await gym.update({
        name,
        address,
        phoneNumber,
        email,
        website,
        isActive
      });

      res.json({ message: 'Gym updated successfully', gym });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.errors.map(e => e.message) });
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Gym with this email or name already exists', details: error.errors.map(e => e.message) });
      }
      console.error('Error updating gym:', error);
      next(error);
    }
  }

  async deleteGym(req, res, next) {
    try {
      const gymId = req.params.id;
      const gym = await Gym.findByPk(gymId);

      if (!gym) {
        return res.status(404).json({ message: 'Gym not found' });
      }

      // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنه الحذف
      if (req.user.role !== 'SUPER_ADMIN' && gym.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'You are not authorized to delete this gym' });
      }

      // قبل الحذف، قد ترغب في التعامل مع الكيانات التابعة (مثل الفروع، الموظفين، إلخ)
      // على سبيل المثال، إلغاء ربط الموظفين أو حذف الفروع
      // هذا يعتمد على منطق عملك وقيود المفاتيح الأجنبية

      // أيضًا، قم بإلغاء ربط gymId من المستخدم المالك
      await User.update({ gymId: null }, { where: { id: gym.ownerId, gymId: gym.id } });

      await gym.destroy();

      res.status(200).json({ message: 'Gym deleted successfully' }); // 200 أو 204 No Content
    } catch (error) {
      console.error('Error deleting gym:', error);
      next(error);
    }
  }
}

module.exports = new GymController();
