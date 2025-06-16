const { User } = require('../models');
const bcrypt = require('bcryptjs');

class UserService {
  async createUser(userData) {
    const { firstName, lastName, email, password, role, phoneNumber, accountStatus, gymId, branchId } = userData;

    if (!password) {
      throw new Error('Password is required');
    }
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const newUserInstance = await User.create({
        firstName,
        lastName,
        email,
        passwordHash,
        role: role || 'MEMBER',
        phoneNumber,
        accountStatus: accountStatus || 'ACTIVE',
        gymId,      
        branchId,   
      });
      
      return newUserInstance; // Return Sequelize instance directly
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' || (error.errors?.some(e => e.type === 'unique violation'))) {
        throw new Error('User with this email already exists');
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message).join(', ');
        throw new Error(`Validation error: ${messages}`);
      }
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        let fieldName = "related entity";
        if (error.parent?.constraint) { 
             if (error.parent.constraint.toLowerCase().includes('gymid')) fieldName = 'Gym';
             else if (error.parent.constraint.toLowerCase().includes('branchid')) fieldName = 'Branch';
        } else if (error.fields?.includes('gymId')) { 
            fieldName = 'Gym';
        } else if (error.fields?.includes('branchId')) {
            fieldName = 'Branch';
        }
        throw new Error(`${fieldName} not found or invalid.`);
      }
      throw error;
    }
  }

  async findUserByEmail(email) {
    const user = await User.findOne({ 
      where: { email },
      // include: [
      //   { model: User.sequelize.models.Gym, as: 'gym', required: false }, 
      //   { model: User.sequelize.models.Branch, as: 'branch', required: false }
      // ]
    });
    return user; 
  }

  async findUserById(id) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
      // include: [
      //   { model: User.sequelize.models.Gym, as: 'gym', required: false },
      //   { model: User.sequelize.models.Branch, as: 'branch', required: false }
      // ]
    });
    return user;
  }
}

module.exports = new UserService();
