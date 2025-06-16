const { User, Gym, Branch, BranchStaffAssignment } = require('../models'); 
const { Op } = require('sequelize');
const userService = require('../services/userService');

class UserController {
  async createUserByAdmin(req, res, next) {
    try {
      const creator = req.user; 
      const { firstName, lastName, email, password, role, phoneNumber, gymId, branchId } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: 'First name, last name, email, password, and role are required.' });
      }

      const validRoles = Object.values(User.rawAttributes.role.values);
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Valid roles are: ${validRoles.join(', ')}` });
      }

      let accountStatus = 'ACTIVE';
      let finalGymId = null;
      let finalBranchId = null;

      switch (creator.role) {
        case 'SUPER_ADMIN': {
          if (!['ADMIN_STAFF', 'GYM_OWNER'].includes(role)) {
            return res.status(403).json({ message: `SUPER_ADMIN can only create ADMIN_STAFF or GYM_OWNER.` });
          }
          if (gymId) {
            const gymExists = await Gym.findByPk(gymId);
            if (!gymExists) return res.status(404).json({ message: `Gym with ID ${gymId} not found.`});
            finalGymId = gymId;
          }
          if (branchId) {
            const branchExists = await Branch.findByPk(branchId);
            if (!branchExists) return res.status(404).json({ message: `Branch with ID ${branchId} not found.`});
            if (finalGymId && branchExists.gymId !== finalGymId) {
                 return res.status(400).json({ message: `Branch ID ${branchId} does not belong to Gym ID ${finalGymId}.`});
            }
            finalBranchId = branchId;
            if (!finalGymId) finalGymId = branchExists.gymId; 
          }
          break;
        }
        case 'GYM_OWNER': {
          if (creator.accountStatus !== 'ACTIVE') {
            return res.status(403).json({ message: 'Your GYM_OWNER account is not active.' });
          }
          if (!['RECEPTIONIST', 'TRAINER'].includes(role)) {
            return res.status(403).json({ message: `GYM_OWNER can only create RECEPTIONIST or TRAINER.` });
          }
          if (!gymId) {
            return res.status(400).json({ message: "Gym ID is required when GYM_OWNER creates staff." });
          }
          const ownedGym = await Gym.findOne({ where: { id: gymId, ownerId: creator.id } });
          if (!ownedGym) {
            return res.status(403).json({ message: "You do not own this gym or gym not found." });
          }
          finalGymId = ownedGym.id;
          if (branchId) { 
            const branchInGym = await Branch.findOne({ where: { id: branchId, gymId: finalGymId }});
            if (!branchInGym) {
                return res.status(400).json({ message: "Branch not found or does not belong to the specified gym."}); 
            }
            finalBranchId = branchInGym.id;
          }
          break;
        }
        case 'RECEPTIONIST': {
          if (creator.accountStatus !== 'ACTIVE') {
            return res.status(403).json({ message: 'Your RECEPTIONIST account is not active.' });
          }
          if (role !== 'MEMBER') {
            return res.status(403).json({ message: `RECEPTIONIST can only create MEMBER.` });
          }
          if (!branchId) { 
            return res.status(400).json({ message: "Branch ID is required when RECEPTIONIST creates members." });
          }
          const receptionistBranchAssignment = await BranchStaffAssignment.findOne({
            where: { userId: creator.id, branchId: parseInt(branchId) } 
          });
          if (!receptionistBranchAssignment) {
             return res.status(403).json({ message: "You are not assigned to the specified branch for member creation." });
          }
          const memberBranch = await Branch.findByPk(branchId);
          if (!memberBranch) return res.status(404).json({ message: "Branch for member not found."}); 
          finalBranchId = memberBranch.id;
          finalGymId = memberBranch.gymId; 
          break;
        }
        default:
          return res.status(403).json({ message: 'You are not authorized to create users.' });
      }

      const newUser = await userService.createUser({
        firstName, lastName, email, password, role, phoneNumber, accountStatus,
        gymId: finalGymId,
        branchId: finalBranchId,
      });
      
      if (['RECEPTIONIST', 'TRAINER'].includes(role) && finalBranchId) {
          const existingAssignment = await BranchStaffAssignment.findOne({
              where: { userId: newUser.id, branchId: finalBranchId }
          });
          if (!existingAssignment) {
            await BranchStaffAssignment.create({ userId: newUser.id, branchId: finalBranchId });
          }
      }

      res.status(201).json({ message: `User with role ${role} created successfully.`, user: newUser });

    } catch (error) {
      if (error.message?.toLowerCase().includes('user with this email already exists')) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }
      if (error.message?.toLowerCase().includes('validation error') || error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.errors ? error.errors.map(e => e.message) : error.message });
      }
      if (error.message?.includes('not found or invalid')) { 
          return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  }

  async approveUserAccount(req, res, next) {
    try {
      const { userId } = req.params;

      const userToApprove = await User.findByPk(userId);

      if (!userToApprove) {
        return res.status(404).json({ message: 'User to approve not found.' });
      }

      if (userToApprove.role !== 'GYM_OWNER') {
        return res.status(400).json({ message: 'This endpoint is only for approving GYM_OWNER accounts.' });
      }

      if (userToApprove.accountStatus === 'ACTIVE') {
        return res.status(400).json({ message: 'User account is already active.' });
      }

      if (userToApprove.accountStatus !== 'PENDING_APPROVAL') {
        return res.status(400).json({ message: `Cannot approve account with status: ${userToApprove.accountStatus}.`});
      }

      userToApprove.accountStatus = 'ACTIVE';
      await userToApprove.save();

      const userJson = userToApprove.toJSON();
      delete userJson.passwordHash;

      res.json({ message: `User account for ${userToApprove.email} approved successfully.`, user: userJson });

    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['passwordHash'] },
      });
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUserProfile(req, res, next) {
    try {
      res.json(req.user);
    } catch (error) {
      next(error);
    }
  }

  async getUserProfileById(req, res, next) {
    try {
      const { userId } = req.params;
      const requestingUser = req.user;

      if (requestingUser.role !== 'SUPER_ADMIN' && parseInt(userId) !== requestingUser.id) {
        return res.status(403).json({ message: 'Unauthorized to view this profile.' });
      }

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['passwordHash'] },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
  
  async updateCurrentUserProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phoneNumber } = req.body;

      const user = await User.findByPk(userId);
      if (!user) { 
        return res.status(404).json({ message: 'User not found.' });
      }

      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

      await user.save();
      
      const updatedUserJson = user.toJSON();
      delete updatedUserJson.passwordHash;
      res.json(updatedUserJson);
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.errors.map(e => e.message) });
      }
      next(error);
    }
  }

  async updateUserById(req, res, next) {
    try {
      const { userId } = req.params;
      const { firstName, lastName, phoneNumber, email, accountStatus } = req.body;

      const userToUpdate = await User.findByPk(userId);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (email && email !== userToUpdate.email) {
        const existingUser = await User.findOne({ where: { email, id: { [Op.ne]: userId } } });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use by another account.' });
        }
        userToUpdate.email = email;
      }

      if (firstName !== undefined) userToUpdate.firstName = firstName;
      if (lastName !== undefined) userToUpdate.lastName = lastName;
      if (phoneNumber !== undefined) userToUpdate.phoneNumber = phoneNumber;
      
      if (accountStatus !== undefined) {
        const validAccountStatuses = Object.values(User.rawAttributes.accountStatus.values);
        if (!validAccountStatuses.includes(accountStatus)) {
          return res.status(400).json({ message: `Invalid account status. Valid statuses are: ${validAccountStatuses.join(', ')}` });
        }
        if (userToUpdate.role === 'SUPER_ADMIN' && accountStatus !== 'ACTIVE') {
            const superAdminCount = await User.count({ where: { role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' } });
            if (superAdminCount <= 1 && userToUpdate.id.toString() === req.user.id.toString()) { 
              return res.status(400).json({ message: 'Cannot deactivate the only active SUPER_ADMIN or yourself if you are the one.' });
            }
        }
        userToUpdate.accountStatus = accountStatus;
      }

      await userToUpdate.save();
      const updatedUserJson = userToUpdate.toJSON();
      delete updatedUserJson.passwordHash;
      res.json(updatedUserJson);
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.errors.map(e => e.message) });
      }
      next(error);
    }
  }

  async changeUserRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body; 

      if (!role) {
        return res.status(400).json({ message: 'New role is required.' });
      }

      const validRoles = Object.values(User.rawAttributes.role.values);
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Valid roles are: ${validRoles.join(', ')}` });
      }

      const userToUpdate = await User.findByPk(userId);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (userToUpdate.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
         const superAdminCount = await User.count({ where: { role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' } });
         if (superAdminCount <= 1) {
           return res.status(400).json({ message: 'Cannot change the role of the only active SUPER_ADMIN.' });
         }
      }
      if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
          return res.status(403).json({ message: 'Only a SUPER_ADMIN can assign the SUPER_ADMIN role.'});
      }

      if (userToUpdate.role === role) {
        return res.status(400).json({ message: `User already has the role '${role}'.` });
      }

      userToUpdate.role = role;
      await userToUpdate.save();

      const updatedUserJson = userToUpdate.toJSON();
      delete updatedUserJson.passwordHash;

      res.json({ message: `User role updated to '${role}'.`, user: updatedUserJson });
    } catch (error) {
      next(error);
    }
  }

  async deleteUserById(req, res, next) {
    try {
        const { userId } = req.params;
        const requestingUser = req.user;

        if (parseInt(userId) === requestingUser.id) {
            return res.status(400).json({ message: 'You cannot deactivate your own account through this endpoint.' });
        }

        const userToDelete = await User.findByPk(userId);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (userToDelete.role === 'SUPER_ADMIN') {
             const superAdminCount = await User.count({ where: { role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' } });
             if (superAdminCount <= 1) {
               return res.status(400).json({ message: 'Cannot deactivate the only active SUPER_ADMIN.' });
             }
        }

        userToDelete.accountStatus = 'DELETED'; 
        userToDelete.email = `${userToDelete.email}_${Date.now()}_deleted`; 
        
        await userToDelete.save();

        res.status(200).json({ message: 'User account deactivated successfully.' });
    } catch (error) {
        next(error);
    }
  }
}

module.exports = new UserController();
