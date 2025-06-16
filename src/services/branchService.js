const { Branch, Gym, User } = require('../models'); // استيراد النماذج اللازمة

class BranchService {
  async createBranch(branchData, gymId, requestingUserId, userRole) {
    const { name, address, phoneNumber, email, operatingHours } = branchData;

    const gym = await Gym.findByPk(gymId);
    if (!gym) {
      throw new Error('Gym not found');
    }

    // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنهم إضافة فرع
    if (userRole !== 'SUPER_ADMIN' && gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not own this gym to add a branch.');
    }

    try {
      const newBranch = await Branch.create({
        gymId,
        name,
        address,
        phoneNumber,
        email,
        operatingHours, // يمكن أن يكون JSON أو نص
        isActive: true // افتراضيًا يكون الفرع نشطًا عند الإنشاء
      });
      return newBranch;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields.email) {
        throw new Error('Branch with this email already exists in this gym'); // أو بشكل عام
      }
      throw error;
    }
  }

  async getAllBranches(gymId = null) {
    const queryOptions = {
      include: [
        { model: Gym, as: 'gym', attributes: ['id', 'name'] }
        // يمكنك إضافة include للموظفين أو المعدات لاحقًا
      ]
    };
    if (gymId) {
      queryOptions.where = { gymId };
    }
    const branches = await Branch.findAll(queryOptions);
    return branches;
  }

  async getBranchById(branchId) {
    const branch = await Branch.findByPk(branchId, {
      include: [
        { model: Gym, as: 'gym', include: [{model: User, as: 'owner', attributes: ['id', 'email']}] }
        // يمكنك إضافة include للموظفين أو المعدات لاحقًا
      ]
    });
    if (!branch) {
      throw new Error('Branch not found');
    }
    return branch;
  }

  async updateBranch(branchId, branchData, requestingUserId, userRole) {
    const branch = await this.getBranchById(branchId); // يتضمن التحقق من وجود الفرع وجلب معلومات الصالة والمالك

    // التحقق من الصلاحيات: فقط مالك الصالة (التي يتبع لها الفرع) أو SUPER_ADMIN يمكنهم التعديل
    if (userRole !== 'SUPER_ADMIN' && branch.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to update this branch.');
    }

    const { name, address, phoneNumber, email, operatingHours, isActive, gymId } = branchData;

    // منع تغيير gymId للفرع إلا بواسطة SUPER_ADMIN (أو قد تقرر منعه تمامًا)
    if (gymId && gymId !== branch.gymId && userRole !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized: Only SUPER_ADMIN can change the branch\'s parent gym.');
    }
    if (gymId && gymId !== branch.gymId) {
        const newGym = await Gym.findByPk(gymId);
        if (!newGym) throw new Error('New parent gym not found.');
        // تأكد أن SUPER_ADMIN لا ينقل الفرع إلى صالة لا يملكها مالك آخر بدون قصد
        // هذا قد يتطلب منطقًا أكثر تعقيدًا أو سياسة واضحة
    }

    try {
      const updatedBranch = await branch.update({
        name: name !== undefined ? name : branch.name,
        address: address !== undefined ? address : branch.address,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : branch.phoneNumber,
        email: email !== undefined ? email : branch.email,
        operatingHours: operatingHours !== undefined ? operatingHours : branch.operatingHours,
        isActive: isActive !== undefined ? isActive : branch.isActive,
        gymId: gymId && userRole === 'SUPER_ADMIN' ? gymId : branch.gymId,
      });
      return updatedBranch;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields.email) {
        throw new Error('Another branch with this email already exists');
      }
      throw error;
    }
  }

  async deleteBranch(branchId, requestingUserId, userRole) {
    const branch = await this.getBranchById(branchId); // يتضمن التحقق من وجود الفرع وجلب معلومات الصالة والمالك

    // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنهم الحذف
    if (userRole !== 'SUPER_ADMIN' && branch.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to delete this branch.');
    }

    // يمكنك إضافة منطق هنا للتعامل مع الكيانات المرتبطة (مثل الموظفين، المعدات)
    // قبل حذف الفرع.

    await branch.destroy();
    return { message: 'Branch deleted successfully' };
  }
}

module.exports = new BranchService();
