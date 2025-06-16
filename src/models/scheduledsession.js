'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ScheduledSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ScheduledSession.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch',
        allowNull: false
      });
      ScheduledSession.belongsTo(models.TrainingClassType, {
        foreignKey: 'classTypeId',
        as: 'trainingClassType',
        allowNull: false
      });
      ScheduledSession.belongsTo(models.User, { // العلاقة مع المدرب
        foreignKey: 'trainerId',
        as: 'trainer',
        allowNull: false
        // يمكنك إضافة شرط هنا للتأكد أن المستخدم هو مدرب إذا أردت
        // scope: { role: 'TRAINER' } // هذا يتطلب تعريف scope في نموذج User
      });

      ScheduledSession.belongsToMany(models.User, { // تمت الإضافة/التعديل - للمسجلين
        through: models.SessionEnrollment, // الجدول الوسيط
        foreignKey: 'sessionId',        // المفتاح في الجدول الوسيط الذي يشير إلى ScheduledSession
        otherKey: 'memberId',      // المفتاح في الجدول الوسيط الذي يشير إلى User (العضو)
        as: 'enrolledMembers'     // اسم مستعار للعلاقة
      });
    }
  }
  ScheduledSession.init({
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Branches', key: 'id' }
    },
    classTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'TrainingClassTypes', key: 'id' }
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    currentEnrollment: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED'),
      allowNull: false,
      defaultValue: 'SCHEDULED'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ScheduledSession',
  });
  return ScheduledSession;
};