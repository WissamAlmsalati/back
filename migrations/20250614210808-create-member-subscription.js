'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MemberSubscriptions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      memberId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // إذا حُذف العضو، يُحذف اشتراكه
      },
      planId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'MembershipPlans', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // لمنع حذف الخطة إذا كان هناك مشتركين فيها
      },
      startDate: {
        type: Sequelize.DATEONLY, // استخدام DATEONLY لتاريخ البدء
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATEONLY, // استخدام DATEONLY لتاريخ الانتهاء
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT'),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },
      paymentDetails: {
        type: Sequelize.JSON,
        allowNull: true // اختياري
      },
      autoRenew: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.dropTable('MemberSubscriptions');
  }
};