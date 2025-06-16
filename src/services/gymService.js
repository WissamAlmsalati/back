const { Gym, User, Branch } = require('../models'); // استيراد النماذج اللازمة

class GymService {
  async createGym(gymData, ownerId) {
    const { name, address, phoneNumber, email, website } = gymData;

    // التحقق من أن المالك موجود (اختياري، لكنه جيد)
    const owner = await User.findByPk(ownerId);
    if (!owner) {
      throw new Error('Owner not found');
    }
    // يمكنك إضافة تحقق هنا للتأكد من أن دور المالك مناسب (مثلاً GYM_OWNER)
    // if (owner.role !== 'GYM_OWNER') {
    //   throw new Error('User does not have permission to own a gym');
    // }

    try {
      const newGym = await Gym.create({
        name,
        ownerId,
        address,
        phoneNumber,
        email,
        website,
        isActive: true // افتراضيًا تكون الصالة نشطة عند الإنشاء
      });
      return newGym;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields.email) {
        throw new Error('Gym with this email already exists');
      }
      // يمكنك إضافة معالجة لأخطاء أخرى خاصة بـ Sequelize هنا
      throw error;
    }
  }

  async getAllGyms(options = {}) {
    // options يمكن أن تحتوي على pagination, filtering, sorting لاحقًا
    const gyms = await Gym.findAll({
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        // يمكنك إضافة include لـ Branches أو MembershipPlans إذا أردت عرضها هنا
        // { model: Branch, as: 'branches' }
      ],
      // attributes: { exclude: ['ownerId'] } // إذا كنت لا تريد ownerId بشكل منفصل
    });
    return gyms;
  }

  async getGymById(gymId) {
    const gym = await Gym.findByPk(gymId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Branch, as: 'branches' } // عرض الفروع التابعة لهذه الصالة
        // يمكنك إضافة include لـ MembershipPlans هنا أيضًا
      ]
    });
    if (!gym) {
      throw new Error('Gym not found');
    }
    return gym;
  }

  async updateGym(gymId, gymData, requestingUserId, userRole) {
    const gym = await this.getGymById(gymId); // يعيد خطأ إذا لم يتم العثور على الصالة

    // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنهم التعديل
    if (userRole !== 'SUPER_ADMIN' && gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not own this gym');
    }

    const { name, address, phoneNumber, email, website, isActive, ownerId } = gymData;

    // منع تغيير المالك إلا بواسطة SUPER_ADMIN (اختياري)
    if (ownerId && ownerId !== gym.ownerId && userRole !== 'SUPER_ADMIN') {
        throw new Error('Unauthorized: Only SUPER_ADMIN can change gym ownership.');
    }
    if (ownerId && ownerId !== gym.ownerId) { // إذا كان SUPER_ADMIN يغير المالك
        const newOwner = await User.findByPk(ownerId);
        if (!newOwner) throw new Error('New owner not found.');
        // يمكنك إضافة تحقق من دور المالك الجديد هنا
    }


    try {
      const updatedGym = await gym.update({
        name: name !== undefined ? name : gym.name,
        address: address !== undefined ? address : gym.address,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : gym.phoneNumber,
        email: email !== undefined ? email : gym.email,
        website: website !== undefined ? website : gym.website,
        isActive: isActive !== undefined ? isActive : gym.isActive,
        ownerId: ownerId !== undefined && userRole === 'SUPER_ADMIN' ? ownerId : gym.ownerId,
      });
      return updatedGym;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && error.fields.email) {
        throw new Error('Another gym with this email already exists');
      }
      throw error;
    }
  }

  async deleteGym(gymId, requestingUserId, userRole) {
    const gym = await this.getGymById(gymId); // يعيد خطأ إذا لم يتم العثور على الصالة

    // التحقق من الصلاحيات: فقط مالك الصالة أو SUPER_ADMIN يمكنهم الحذف
    if (userRole !== 'SUPER_ADMIN' && gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not own this gym');
    }

    // يمكنك إضافة منطق هنا للتعامل مع الكيانات المرتبطة (مثل الفروع)
    // مثلاً: حذف الفروع التابعة، أو منع الحذف إذا كانت هناك فروع نشطة
    // const branches = await Branch.count({ where: { gymId } });
    // if (branches > 0) {
    //   throw new Error('Cannot delete gym with active branches. Please delete branches first.');
    // }

    await gym.destroy();
    return { message: 'Gym deleted successfully' };
  }
}

module.exports = new GymService();
