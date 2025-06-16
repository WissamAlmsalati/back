'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrainingClassType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TrainingClassType.hasMany(models.ScheduledSession, {
        foreignKey: 'classTypeId',
        as: 'scheduledSessions' // اسم مستعار للعلاقة
      });
    }
  }
  TrainingClassType.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    defaultDurationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    defaultCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'TrainingClassType',
  });
  return TrainingClassType;
};