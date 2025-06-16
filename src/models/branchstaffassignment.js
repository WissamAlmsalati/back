'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BranchStaffAssignment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BranchStaffAssignment.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        allowNull: false
      });
      BranchStaffAssignment.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch',
        allowNull: false
      });
    }
  }
  BranchStaffAssignment.init({
    // id field is automatically created by Sequelize as primary key
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { // For documentation, enforced by migration
        model: 'Users',
        key: 'id'
      }
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { // For documentation, enforced by migration
        model: 'Branches',
        key: 'id'
      }
    },
    assignedRole: {
      type: DataTypes.ENUM('RECEPTIONIST', 'TRAINER'),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'BranchStaffAssignment',
    // tableName: 'BranchStaffAssignments', // Optional: if you want to be explicit
    // timestamps: true, // Default: true, adds createdAt and updatedAt
    indexes: [ // For documentation, enforced by migration
      {
        unique: true,
        fields: ['userId', 'branchId', 'assignedRole'],
        name: 'unique_user_branch_role_assignment'
      }
    ]
  });
  return BranchStaffAssignment;
};