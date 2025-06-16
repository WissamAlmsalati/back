'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      console.log('[User.associate] ENTERED. Available model keys in "models" object:', Object.keys(models));

      const checkModel = (modelName) => {
        if (models[modelName]) {
          const isInstance = models[modelName] && models[modelName].prototype && models[modelName].prototype instanceof Model;
          console.log(`[User.associate] Checking models.${modelName}: Name: ${models[modelName].name}, IsSequelizeModel: ${isInstance}`);
          if (!isInstance) {
            console.error(`[User.associate] CRITICAL: models.${modelName} is NOT a valid Sequelize Model class.`);
          }
        } else {
          console.log(`[User.associate] models.${modelName} is undefined or null.`);
        }
      };

      checkModel('Gym');
      checkModel('Branch');
      checkModel('BranchStaffAssignment');
      checkModel('Booking');
      checkModel('SessionEnrollment');

      try {
        User.hasMany(models.Gym, { // تمت الإضافة - علاقة المستخدم بالصالات التي يمتلكها
          foreignKey: 'ownerId',
          as: 'ownedGyms' // اسم مستعار للعلاقة
        });
        console.log('[User.associate] User.hasMany(models.Gym) called successfully.');
      } catch (e) {
        console.error('[User.associate] ERROR during User.hasMany(models.Gym):', e.message);
      }

      try {
        User.belongsToMany(models.Branch, { // تمت الإضافة
          through: models.BranchStaffAssignment, // الجدول الوسيط
          foreignKey: 'userId',        // المفتاح في الجدول الوسيط الذي يشير إلى User
          otherKey: 'branchId',      // المفتاح في الجدول الوسيط الذي يشير إلى Branch
          as: 'assignedBranches'     // اسم مستعار للعلاقة
        });
        console.log('[User.associate] User.belongsToMany(models.Branch) called successfully.');
      } catch (e) {
        console.error('[User.associate] ERROR during User.belongsToMany(models.Branch):', e.message);
      }
      
      User.hasMany(models.Booking, { // Assuming Booking model exists
        foreignKey: 'userId',
        as: 'bookings'
      });

      User.hasMany(models.SessionEnrollment, { 
        foreignKey: 'userId',
        as: 'sessionEnrollments'
      });
      
      User.belongsTo(models.Gym, {
        foreignKey: 'gymId',
        as: 'gym',
        allowNull: true 
      });
      
      User.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch',
        allowNull: true 
      });
      console.log('[User.associate] FINISHED.');
    }

    async validatePassword(password) {
      return bcrypt.compare(password, this.passwordHash);
    }
  }
  User.init({
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { // تمت الإضافة - للتحقق من صحة البريد الإلكتروني
        isEmail: true
      }
    },
    passwordHash: { // تم تغيير الاسم من password إلى passwordHash
      type: DataTypes.STRING,
      allowNull: false
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true // اختياري
    },
    role: {
      type: DataTypes.ENUM('SUPER_ADMIN', 'ADMIN_STAFF', 'GYM_OWNER', 'RECEPTIONIST', 'TRAINER', 'MEMBER'),
      allowNull: false,
      defaultValue: 'MEMBER',
    },
    accountStatus: { // تم استبدال isActive بـ accountStatus
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'DELETED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    gymId: {
      type: DataTypes.INTEGER, 
      allowNull: true,
      references: {
        model: 'Gyms',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    branchId: {
      type: DataTypes.INTEGER, 
      allowNull: true,
      references: {
        model: 'Branches',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true,
  });
  return User;
};