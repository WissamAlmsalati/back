'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BranchStaffAssignments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // اسم جدول المستخدمين
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // إذا حذف المستخدم، يحذف تعيينه
      },
      branchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Branches', // اسم جدول الفروع
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // إذا حذف الفرع، يحذف التعيين
      },
      assignedRole: {
        type: Sequelize.ENUM('RECEPTIONIST', 'TRAINER'), // تم التعديل إلى ENUM
        allowNull: false
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

    // إضافة فهرس مركب لضمان عدم تكرار تعيين نفس المستخدم بنفس الدور في نفس الفرع
    await queryInterface.addIndex(
      'BranchStaffAssignments',
      ['userId', 'branchId', 'assignedRole'],
      {
        unique: true,
        name: 'unique_user_branch_role_assignment'
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('BranchStaffAssignments', 'unique_user_branch_role_assignment'); // إزالة الفهرس عند التراجع
    await queryInterface.dropTable('BranchStaffAssignments');
  }
};