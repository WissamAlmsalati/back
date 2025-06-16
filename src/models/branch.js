'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Branch extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Branch.belongsTo(models.Gym, { // تمت الإضافة - علاقة الفرع بالصالة الرياضية
        foreignKey: 'gymId',
        as: 'gym', // اسم مستعار للعلاقة
        allowNull: false
      });

      Branch.belongsToMany(models.User, { // تمت الإضافة/التعديل
        through: models.BranchStaffAssignment, // الجدول الوسيط
        foreignKey: 'branchId',      // المفتاح في الجدول الوسيط الذي يشير إلى Branch
        otherKey: 'userId',        // المفتاح في الجدول الوسيط الذي يشير إلى User
        as: 'staff'                // اسم مستعار للعلاقة (لجلب الموظفين المعينين لهذا الفرع)
      });

      Branch.hasMany(models.Equipment, { // تمت الإضافة/التعديل
        foreignKey: 'branchId',
        as: 'equipment' // اسم مستعار للعلاقة
      });

      Branch.hasMany(models.ScheduledSession, { // تمت الإضافة/التعديل
        foreignKey: 'branchId',
        as: 'scheduledSessions' // اسم مستعار للعلاقة
      });
    }
  }
  Branch.init({
    gymId: { // تم الإبقاء عليه ليكون واضحًا، لكن العلاقة الفعلية تُعرف في associate
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Gyms',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    operatingHours: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Branch',
  });
  return Branch;
};