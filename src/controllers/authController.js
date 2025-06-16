const userService = require('../services/userService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models'); 

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_jwt_secret';

class AuthController {
  async register(req, res, next) {
    try {
      let { firstName, lastName, email, password, role, phoneNumber } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'First name, last name, email, and password are required' });
      }

      const validRolesFromModel = Object.values(User.rawAttributes.role.values);
      if (role && !validRolesFromModel.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Valid roles are: ${validRolesFromModel.join(', ')}` });
      }

      const allowedSelfRegisterRoles = ['MEMBER', 'GYM_OWNER']; 

      if (role && !allowedSelfRegisterRoles.includes(role)) {
        return res.status(403).json({ 
          message: `Role '${role}' cannot self-register. Please contact an administrator for account creation.` 
        });
      }
      
      if (!role) {
        role = 'MEMBER';
      }

      let accountStatus;
      switch (role) {
        case 'GYM_OWNER':
          accountStatus = 'PENDING_APPROVAL';
          break;
        case 'MEMBER':
        default: 
          accountStatus = 'ACTIVE';
          break;
      }

      const newUser = await userService.createUser({
        firstName,
        lastName,
        email,
        password,
        role,
        phoneNumber,
        accountStatus
      });

      const userResponse = newUser.toJSON(); // This will now work correctly
      delete userResponse.passwordHash;
      // Optionally delete createdAt and updatedAt if not needed in the response
      // delete userResponse.createdAt;
      // delete userResponse.updatedAt;

      res.status(201).json({ message: 'User registered successfully.', user: userResponse });
    } catch (error) {
      if (error.message?.toLowerCase().includes('user with this email already exists')) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }
      if (error.message?.toLowerCase().includes('validation error') || error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation error', details: error.errors ? error.errors.map(e => e.message) : error.message });
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await userService.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials - user not found' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials - password mismatch' });
      }

      if (user.accountStatus !== 'ACTIVE') {
        let message = 'Account is not active. Please contact support.';
        if (user.accountStatus === 'PENDING_APPROVAL') {
          message = 'Account is pending approval. Please wait for an administrator to activate your account.';
        } else if (user.accountStatus === 'INACTIVE') {
          message = 'Account is inactive.';
        } else if (user.accountStatus === 'SUSPENDED') {
          message = 'Account is suspended.';
        }
        return res.status(403).json({ message, accountStatus: user.accountStatus });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountStatus: user.accountStatus,
          gymId: user.gymId, // Include gymId in token if it exists
          branchId: user.branchId // Include branchId in token if it exists
        },
        JWT_SECRET,
        { expiresIn: '1h' } 
      );

      const userInToken = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountStatus: user.accountStatus,
        phoneNumber: user.phoneNumber,
        gymId: user.gymId,
        branchId: user.branchId
      };

      res.json({ token, user: userInToken });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      // req.user is populated by the authMiddleware with the decoded token payload
      // We can fetch the latest user details from the database if needed, 
      // or just return the token payload which should be up-to-date enough for most 'me' endpoints.
      const userFromDb = await User.findByPk(req.user.id, {
        attributes: { exclude: ['passwordHash'] }
      });

      if (!userFromDb) {
        return res.status(404).json({ message: 'User not found in database (token might be outdated)'});
      }

      res.json(userFromDb);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
