'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SessionEnrollments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ScheduledSessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // إذا حُذفت الحصة، يُحذف التسجيل
      },
      memberId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' }, // يفترض أن العضو هو مستخدم
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // إذا حُذف العضو، يُحذف تسجيله
      },
      enrollmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      status: {
        type: Sequelize.ENUM('ENROLLED', 'CANCELLED_BY_MEMBER', 'CANCELLED_BY_SYSTEM', 'ATTENDED', 'NO_SHOW'),
        allowNull: false,
        defaultValue: 'ENROLLED'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true // اختياري
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

    // إضافة فهرس مركب لضمان عدم تسجيل نفس العضو في نفس الحصة أكثر من مرة
    await queryInterface.addIndex(
      'SessionEnrollments',
      ['sessionId', 'memberId'],
      {
        unique: true,
        name: 'unique_session_member_enrollment'
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('SessionEnrollments', 'unique_session_member_enrollment');
    await queryInterface.dropTable('SessionEnrollments');
  }
};