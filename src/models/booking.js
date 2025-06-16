'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Booking extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Booking.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Booking.belongsTo(models.ScheduledSession, { // Assuming you have a ScheduledSession model
        foreignKey: 'sessionId',
        as: 'session'
      });
    }
  }
  Booking.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // table name
        key: 'id'
      }
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ScheduledSessions', // table name for scheduled sessions
        key: 'id'
      }
    },
    bookingDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('CONFIRMED', 'CANCELLED', 'PENDING', 'COMPLETED'),
      defaultValue: 'PENDING',
      allowNull: false
    },
    // Add any other attributes you need for a booking
    // e.g., notes, paymentStatus, etc.
  }, {
    sequelize,
    modelName: 'Booking', // This is crucial
    tableName: 'Bookings' // Optional: explicitly set table name
  });
  return Booking;
};
