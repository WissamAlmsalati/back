'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const passwordHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'superadmin123', 10);

    // Check if SUPER_ADMIN already exists to prevent duplicates if seeder runs multiple times
    const existingSuperAdmin = await queryInterface.rawSelect('Users', {
      where: {
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com',
      },
    }, ['id']);

    if (!existingSuperAdmin) {
      await queryInterface.bulkInsert('Users', [{
        firstName: 'Super',
        lastName: 'Admin',
        email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com',
        passwordHash: passwordHash,
        role: 'SUPER_ADMIN',
        accountStatus: 'ACTIVE',
        phoneNumber: '0000000000', // Optional
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
      console.log('Super admin created successfully.');
    } else {
      console.log('Super admin already exists, skipping creation.');
    }
  },

  async down (queryInterface, Sequelize) {
    // This will remove ALL users with the super admin email, be cautious.
    await queryInterface.bulkDelete('Users', { email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com' }, {});
    console.log('Super admin removed if it existed.');
  }
};
