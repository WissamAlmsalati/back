'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ScheduledSessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      branchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // أو 'SET NULL' إذا أردت الاحتفاظ بالجلسة مع إلغاء ربط الفرع
      },
      classTypeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'TrainingClassTypes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // لمنع حذف نوع الحصة إذا كانت هناك حصص مجدولة منه
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' }, // يفترض أن المدرب هو مستخدم
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // لمنع حذف المدرب إذا كان لديه حصص مجدولة
      },
      startTime: {
        type: Sequelize.DATE, // يمثل DATETIME
        allowNull: false
      },
      durationMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      currentEnrollment: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'SCHEDULED'
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ScheduledSessions');
  }
};