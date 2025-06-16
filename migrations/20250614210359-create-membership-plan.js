'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MembershipPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      gymId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Gyms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // إذا حُذفت الصالة، تُحذف خططها
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true // اختياري
      },
      price: {
        type: Sequelize.DECIMAL(10, 2), // تحديد الدقة والمقياس للسعر
        allowNull: false
      },
      durationDays: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true // اختياري
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('MembershipPlans');
  }
};