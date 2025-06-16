const { TrainingClassType, Gym, User, ScheduledSession } = require('../models');

class TrainingClassTypeService {
  async createClassType(classTypeData, gymId, requestingUserId, userRole) {
    const { name, description, defaultDurationMinutes, isActive } = classTypeData;

    if (!name || defaultDurationMinutes === undefined) {
      throw new Error('Class type name and default duration are required.');
    }
    if (isNaN(parseInt(defaultDurationMinutes)) || parseInt(defaultDurationMinutes) <= 0) {
      throw new Error('Default duration must be a positive integer.');
    }

    let targetGym = null;
    if (gymId) {
      targetGym = await Gym.findByPk(gymId);
      if (!targetGym) {
        throw new Error('Gym not found');
      }
      if (userRole !== 'SUPER_ADMIN' && targetGym.ownerId !== requestingUserId) {
        throw new Error('Unauthorized: You do not own this gym to add a class type.');
      }
    } else if (userRole !== 'SUPER_ADMIN') { // تم التبسيط: إذا لم يكن هناك gymId، يجب أن يكون المستخدم SUPER_ADMIN
      throw new Error('Unauthorized: Only SUPER_ADMIN can create global class types.');
    }

    const newClassType = await TrainingClassType.create({
      name,
      description,
      defaultDurationMinutes: parseInt(defaultDurationMinutes),
      gymId: targetGym ? targetGym.id : null,
      isActive: isActive !== undefined ? isActive : true,
    });
    return newClassType;
  }

  async getAllClassTypes(gymId = null, includeGlobal = true) {
    const whereClause = {};
    if (gymId) {
      whereClause[require('sequelize').Op.or] = [
        { gymId: gymId },
        ...(includeGlobal ? [{ gymId: null }] : [])
      ];
    } else if (!includeGlobal) {
        return [];
    }

    const queryOptions = {
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: [{ model: Gym, as: 'gym', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    };

    const classTypes = await TrainingClassType.findAll(queryOptions);
    return classTypes;
  }

  async getClassTypeById(classTypeId) {
    const classType = await TrainingClassType.findByPk(classTypeId, {
      include: [{ model: Gym, as: 'gym', include: [{model: User, as: 'owner', attributes: ['id', 'email']}] }],
    });
    if (!classType) {
      throw new Error('Training class type not found');
    }
    return classType;
  }

  async updateClassType(classTypeId, classTypeData, requestingUserId, userRole) {
    const classType = await this.getClassTypeById(classTypeId);
    const { name, description, defaultDurationMinutes, isActive, gymId: newGymId } = classTypeData;

    if (classType.gymId) {
      const gym = await Gym.findByPk(classType.gymId);
      if (!gym) {
        throw new Error('Associated gym not found for the class type.');
      }
      if (userRole !== 'SUPER_ADMIN' && gym.ownerId !== requestingUserId) {
        throw new Error('Unauthorized: You do not have permission to update this class type.');
      }
    } else if (userRole !== 'SUPER_ADMIN') { // تم التبسيط
      throw new Error('Unauthorized: Only SUPER_ADMIN can update global class types.');
    }

    if (defaultDurationMinutes !== undefined && (isNaN(parseInt(defaultDurationMinutes)) || parseInt(defaultDurationMinutes) <= 0)) {
      throw new Error('Default duration must be a positive integer.');
    }

    let finalGymId = classType.gymId;
    if (newGymId !== undefined) {
      if (newGymId === null) {
        if (userRole !== 'SUPER_ADMIN') throw new Error('Unauthorized: Only SUPER_ADMIN can make a class type global.');
        finalGymId = null;
      } else {
        const targetGym = await Gym.findByPk(newGymId);
        if (!targetGym) throw new Error('Target gym for class type not found.');
        if (userRole !== 'SUPER_ADMIN' && targetGym.ownerId !== requestingUserId) {
          throw new Error('Unauthorized: You do not have permission to assign this class type to the target gym.');
        }
        finalGymId = newGymId;
      }
    }

    const updatedClassType = await classType.update({
      name: name !== undefined ? name : classType.name,
      description: description !== undefined ? description : classType.description,
      defaultDurationMinutes: defaultDurationMinutes !== undefined ? parseInt(defaultDurationMinutes) : classType.defaultDurationMinutes,
      isActive: isActive !== undefined ? isActive : classType.isActive,
      gymId: finalGymId,
    });
    return updatedClassType;
  }

  async deleteClassType(classTypeId, requestingUserId, userRole) {
    const classType = await this.getClassTypeById(classTypeId);

    if (classType.gymId) {
      const gym = await Gym.findByPk(classType.gymId);
      if (!gym) {
        throw new Error('Associated gym not found for the class type.');
      }
      if (userRole !== 'SUPER_ADMIN' && gym.ownerId !== requestingUserId) {
        throw new Error('Unauthorized: You do not have permission to delete this class type.');
      }
    } else if (userRole !== 'SUPER_ADMIN') { // تم التبسيط
      throw new Error('Unauthorized: Only SUPER_ADMIN can delete global class types.');
    }

    const scheduledSessionsCount = await ScheduledSession.count({ where: { classTypeId: classTypeId } });
    if (scheduledSessionsCount > 0) {
      throw new Error('Cannot delete class type: It is currently used in scheduled sessions. Please remove or reassign them first.');
    }

    await classType.destroy();
    return { message: 'Training class type deleted successfully' };
  }
}

module.exports = new TrainingClassTypeService();
