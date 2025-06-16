'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SessionEnrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SessionEnrollment.belongsTo(models.ScheduledSession, {
        foreignKey: 'sessionId',
        as: 'scheduledSession',
        allowNull: false
      });
      SessionEnrollment.belongsTo(models.User, { // العلاقة مع العضو المسجل
        foreignKey: 'memberId',
        as: 'member',
        allowNull: false
        // يمكنك إضافة شرط هنا للتأكد أن المستخدم هو عضو إذا أردت
        // scope: { role: 'MEMBER' }
      });
    }
  }
  SessionEnrollment.init({
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ScheduledSessions', key: 'id' }
    },
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    enrollmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW // Sequelize v6+ uses DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('ENROLLED', 'CANCELLED_BY_MEMBER', 'CANCELLED_BY_SYSTEM', 'ATTENDED', 'NO_SHOW'),
      allowNull: false,
      defaultValue: 'ENROLLED'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'SessionEnrollment',
    indexes: [ // For documentation, enforced by migration
      {
        unique: true,
        fields: ['sessionId', 'memberId'],
        name: 'unique_session_member_enrollment'
      }
    ]
  });
  return SessionEnrollment;
};