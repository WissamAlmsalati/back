require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
  },
  test: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test`,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
  },
  production: {
    // إذا كنت تستخدم DATABASE_URL في الإنتاج، سيعتمد عليه Sequelize
    // يمكنك إبقاء الحقول الأخرى كقيم احتياطية أو إذا لم يتم تعيين DATABASE_URL
    use_env_variable: 'DATABASE_URL', 
    // القيم التالية هي احتياطية إذا لم يتم استخدام DATABASE_URL أو لمرونة إضافية
    username: process.env.DB_USERNAME_PROD || process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD_PROD || process.env.DB_PASSWORD,
    database: process.env.DB_NAME_PROD || process.env.DB_NAME, // اسم قاعدة بيانات الإنتاج
    host: process.env.DB_HOST_PROD || process.env.DB_HOST,
    dialect: process.env.DB_DIALECT_PROD || process.env.DB_DIALECT,
    dialectOptions: {
      // ssl: { // مثال لإعدادات SSL في الإنتاج إذا لزم الأمر
      //   require: true,
      //   rejectUnauthorized: false 
      // }
    }
  }
};
