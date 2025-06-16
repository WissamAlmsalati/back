'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MembershipPlan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MembershipPlan.belongsTo(models.Gym, {
        foreignKey: 'gymId',
        as: 'gym',
        allowNull: false
      });
      MembershipPlan.hasMany(models.MemberSubscription, { // تمت الإضافة/التعديل
        foreignKey: 'planId',
        as: 'subscriptions' // اسم مستعار للاشتراكات في هذه الخطة
      });
    }
  }
  MembershipPlan.init({
    gymId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Gyms', key: 'id' }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'MembershipPlan',
  });
  return MembershipPlan;
};