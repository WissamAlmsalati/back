'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MemberSubscription extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MemberSubscription.belongsTo(models.User, {
        foreignKey: 'memberId',
        as: 'member',
        allowNull: false
      });
      MemberSubscription.belongsTo(models.MembershipPlan, {
        foreignKey: 'planId',
        as: 'membershipPlan',
        allowNull: false
      });
    }
  }
  MemberSubscription.init({
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    planId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'MembershipPlans', key: 'id' }
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    paymentDetails: {
      type: DataTypes.JSON,
      allowNull: true
    },
    autoRenew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'MemberSubscription',
  });
  return MemberSubscription;
};