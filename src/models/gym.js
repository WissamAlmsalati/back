'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Gym extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Gym.belongsTo(models.User, { // تمت الإضافة - علاقة الصالة بالمالك
        foreignKey: 'ownerId',
        as: 'owner', // اسم مستعار للعلاقة
        allowNull: false
      });
      Gym.hasMany(models.Branch, { // تمت الإضافة/التعديل - علاقة الصالة بالفروع
        foreignKey: 'gymId',
        as: 'branches' // اسم مستعار للعلاقة
      });
      Gym.hasMany(models.MembershipPlan, { // تمت الإضافة
        foreignKey: 'gymId',
        as: 'membershipPlans' // اسم مستعار للعلاقة
      });
    }
  }
  Gym.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ownerId: { // تم الإبقاء عليه ليكون واضحًا، لكن العلاقة الفعلية تُعرف في associate
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { // يمكن إضافتها هنا أيضًا للتوثيق، لكنها تُفرض بواسطة الترحيل
        model: 'Users',
        key: 'id'
      }
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
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
    website: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Gym',
  });
  return Gym;
};