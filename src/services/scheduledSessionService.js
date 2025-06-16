const { ScheduledSession, Branch, TrainingClassType, User, Gym } = require('../models');
const { Op } = require('sequelize');

class ScheduledSessionService {
  async createSession(sessionData, branchId, requestingUserId, userRole) {
    const { classTypeId, instructorId, startTime, endTime, maxCapacity, notes } = sessionData;

    if (!classTypeId || !startTime || !endTime) {
      throw new Error('Class type, start time, and end time are required.');
    }

    const branch = await Branch.findByPk(branchId, { include: [{ model: Gym, as: 'gym' }] });
    if (!branch) {
      throw new Error('Branch not found.');
    }

    // الصلاحية: مالك الصالة (التي يتبع لها الفرع)، أو SUPER_ADMIN
    // لاحقًا: BRANCH_MANAGER, أو INSTRUCTOR (إذا كان ينشئ لنفسه ضمن فرعه)
    if (userRole !== 'SUPER_ADMIN' && branch.gym.ownerId !== requestingUserId) {
      // لاحقًا: إضافة تحقق لـ BRANCH_MANAGER أو INSTRUCTOR
      throw new Error('Unauthorized: You do not have permission to create sessions for this branch.');
    }

    const classType = await TrainingClassType.findByPk(classTypeId);
    if (!classType) {
      throw new Error('Training class type not found.');
    }
    // تحقق من أن نوع الحصة إما عام أو يتبع للصالة التي يتبع لها الفرع
    if (classType.gymId !== null && classType.gymId !== branch.gymId) {
        throw new Error('Training class type does not belong to the same gym as the branch.');
    }


    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      throw new Error('Invalid start or end time format.');
    }
    if (parsedStartTime >= parsedEndTime) {
      throw new Error('Start time must be before end time.');
    }
    if (maxCapacity !== undefined && (isNaN(parseInt(maxCapacity)) || parseInt(maxCapacity) <= 0)) {
        throw new Error('Max capacity must be a positive integer.');
    }

    if (instructorId) {
      const instructor = await User.findByPk(instructorId);
      if (!instructor) {
        throw new Error('Instructor not found.');
      }
      // لاحقًا: تحقق من أن المستخدم هو مدرب (دور INSTRUCTOR)
      // لاحقًا: تحقق من تعارض جدول المدرب (أكثر تعقيدًا)
    }

    // لاحقًا: تحقق من تعارض الجلسات في نفس الفرع ونفس الوقت (أكثر تعقيدًا)

    const newSession = await ScheduledSession.create({
      branchId,
      classTypeId,
      instructorId: instructorId || null,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
      currentCapacity: 0, // يبدأ بصفر
      status: 'SCHEDULED', // (SCHEDULED, COMPLETED, CANCELLED)
      notes,
    });
    return newSession;
  }

  async getAllSessions(filters = {}) {
    const { branchId, gymId, instructorId, classTypeId, startDate, endDate, status } = filters;
    const whereClause = {};
    const includeOptions = [
      { model: TrainingClassType, as: 'classType', attributes: ['id', 'name', 'defaultDurationMinutes'] },
      { model: User, as: 'instructor', attributes: ['id', 'firstName', 'lastName', 'email'] },
      {
        model: Branch,
        as: 'branch',
        attributes: ['id', 'name'],
        include: [{ model: Gym, as: 'gym', attributes: ['id', 'name'] }]
      }
    ];

    if (branchId) whereClause.branchId = branchId;
    if (instructorId) whereClause.instructorId = instructorId;
    if (classTypeId) whereClause.classTypeId = classTypeId;
    if (status) whereClause.status = status;

    if (gymId) {
        // إذا تم توفير gymId، نحتاج إلى تعديل includeOptions لجلب الفروع التابعة لهذه الصالة فقط
        // هذا يتطلب تعديلًا في كيفية بناء whereClause أو فلترة النتائج لاحقًا
        // الطريقة الأبسط هي إضافة gymId إلى where clause للـ Branch
        includeOptions.find(i => i.as === 'branch').where = { gymId: gymId };
    }

    if (startDate) whereClause.startTime = { [Op.gte]: new Date(startDate) };
    if (endDate) {
        const parsedEndDate = new Date(endDate);
        parsedEndDate.setHours(23, 59, 59, 999); // نهاية اليوم
        whereClause.endTime = { ...whereClause.endTime, [Op.lte]: parsedEndDate };
    }
     if (startDate && endDate) {
        whereClause.startTime = { [Op.between]: [new Date(startDate), new Date(endDate)] };
        // أو بشكل أدق للتقاط الجلسات التي تتقاطع مع الفترة
        // whereClause[Op.or] = [
        //     { startTime: { [Op.between]: [new Date(startDate), new Date(endDate)] } },
        //     { endTime: { [Op.between]: [new Date(startDate), new Date(endDate)] } },
        //     { [Op.and]: [{ startTime: { [Op.lte]: new Date(startDate)} }, { endTime: { [Op.gte]: new Date(endDate)} }] }
        // ];
    }


    const sessions = await ScheduledSession.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['startTime', 'ASC']],
    });
    return sessions;
  }

  async getSessionById(sessionId) {
    const session = await ScheduledSession.findByPk(sessionId, {
      include: [
        { model: TrainingClassType, as: 'classType' },
        { model: User, as: 'instructor' },
        {
          model: Branch,
          as: 'branch',
          include: [{ model: Gym, as: 'gym', include: [{ model: User, as: 'owner' }] }]
        }
      ]
    });
    if (!session) {
      throw new Error('Scheduled session not found');
    }
    return session;
  }

  async updateSession(sessionId, sessionData, requestingUserId, userRole) {
    const session = await this.getSessionById(sessionId); // يتضمن التحقق من وجود الجلسة
    const { instructorId, startTime, endTime, maxCapacity, status, notes, classTypeId, branchId: newBranchId } = sessionData;

    // التحقق من الصلاحيات (مالك الصالة أو SUPER_ADMIN)
    if (userRole !== 'SUPER_ADMIN' && session.branch.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to update this session.');
    }

    // التحقق من المدخلات
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      throw new Error('Start time must be before end time.');
    } else if (startTime && !endTime && new Date(startTime) >= session.endTime) {
        throw new Error('New start time must be before current end time if end time is not changed.');
    } else if (endTime && !startTime && session.startTime >= new Date(endTime)) {
        throw new Error('Current start time must be before new end time if start time is not changed.');
    }

    if (maxCapacity !== undefined && (isNaN(parseInt(maxCapacity)) || parseInt(maxCapacity) <= 0)) {
      throw new Error('Max capacity must be a positive integer.');
    }
    if (maxCapacity !== undefined && parseInt(maxCapacity) < session.currentCapacity) {
        throw new Error('Max capacity cannot be less than current booked capacity.');
    }

    if (instructorId) {
      const instructor = await User.findByPk(instructorId);
      if (!instructor) throw new Error('New instructor not found.');
      // لاحقًا: تحقق من دور المدرب وتعارض جدوله
    }

    if (classTypeId) {
        const newClassType = await TrainingClassType.findByPk(classTypeId);
        if (!newClassType) throw new Error('New training class type not found.');
        if (newClassType.gymId !== null && newClassType.gymId !== session.branch.gymId) {
             throw new Error('New training class type does not belong to the same gym as the session\'s branch.');
        }
    }

    if (newBranchId && newBranchId !== session.branchId) {
        const newBranch = await Branch.findByPk(newBranchId, { include: [{ model: Gym, as: 'gym' }] });
        if (!newBranch) throw new Error('New branch not found.');
        // يجب أن يكون للمستخدم صلاحية على الفرع الجديد أيضًا
        if (userRole !== 'SUPER_ADMIN' && newBranch.gym.ownerId !== requestingUserId) {
            throw new Error('Unauthorized: You do not have permission to move session to the target branch.');
        }
        // تحقق من أن نوع الحصة (إذا لم يتغير) متوافق مع الصالة الجديدة
        const currentClassType = classTypeId ? await TrainingClassType.findByPk(classTypeId) : session.classType;
        if (currentClassType.gymId !== null && currentClassType.gymId !== newBranch.gymId) {
            throw new Error('Current class type is not compatible with the new branch\'s gym.');
        }
    }

    // لاحقًا: تحقق من تعارض الجلسات إذا تم تغيير الوقت أو الفرع

    const updatedSession = await session.update({
      instructorId: instructorId !== undefined ? instructorId : session.instructorId,
      startTime: startTime ? new Date(startTime) : session.startTime,
      endTime: endTime ? new Date(endTime) : session.endTime,
      maxCapacity: maxCapacity !== undefined ? parseInt(maxCapacity) : session.maxCapacity,
      status: status !== undefined ? status : session.status,
      notes: notes !== undefined ? notes : session.notes,
      classTypeId: classTypeId !== undefined ? classTypeId : session.classTypeId,
      branchId: newBranchId !== undefined ? newBranchId : session.branchId,
    });
    return updatedSession;
  }

  async deleteSession(sessionId, requestingUserId, userRole) {
    const session = await this.getSessionById(sessionId);

    if (userRole !== 'SUPER_ADMIN' && session.branch.gym.ownerId !== requestingUserId) {
      throw new Error('Unauthorized: You do not have permission to delete this session.');
    }

    // لاحقًا: تحقق إذا كان هناك حجوزات على الجلسة، قد ترغب في منع الحذف أو وضع علامة عليها كـ "ملغاة" بدلاً من ذلك
    if (session.currentCapacity > 0 && session.status !== 'CANCELLED') {
        // throw new Error('Cannot delete session with active bookings. Consider cancelling it first.');
        // أو تغيير الحالة إلى CANCELLED
        await session.update({ status: 'CANCELLED', notes: (session.notes || '') + '\nCancelled due to deletion request.' });
        return { message: 'Session cancelled as it had bookings. To permanently delete, remove bookings first or delete if already cancelled.' };
    }


    await session.destroy();
    return { message: 'Scheduled session deleted successfully' };
  }

  // لاحقًا: وظائف لحجز مكان في الجلسة (تحديث currentCapacity) وإلغاء الحجز
}

module.exports = new ScheduledSessionService();
