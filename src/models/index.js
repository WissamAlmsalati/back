'use strict';
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const db = {};

let dbName = process.env.DB_NAME;
if (env === 'test') {
  dbName = `${process.env.DB_NAME}_test`;
} else if (env === 'production') {
  dbName = `${process.env.DB_NAME}_prod`;
}

const sequelizeConfig = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: dbName,
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
  logging: env === 'development' ? msg => console.log('[Sequelize]', msg) : false, // Enhanced logging
  // dialectOptions: {
  //   ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false
  // }
};

let sequelize;
if (env === 'production' && process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DB_DIALECT,
    logging: sequelizeConfig.logging,
  });
} else {
  const supportedDialects = ['mssql', 'mariadb', 'mysql', 'oracle', 'postgres', 'db2', 'sqlite'];
  if (!sequelizeConfig.dialect || !supportedDialects.includes(sequelizeConfig.dialect)) {
    throw new Error(`The dialect ${sequelizeConfig.dialect || 'undefined'} is not supported or not defined in .env. Supported dialects: ${supportedDialects.join(', ')}.`);
  }
  if (!sequelizeConfig.database || !sequelizeConfig.username || !sequelizeConfig.host) {
     throw new Error('DB_NAME, DB_USERNAME, and DB_HOST must be defined in .env');
  }
  sequelize = new Sequelize(sequelizeConfig.database, sequelizeConfig.username, sequelizeConfig.password, sequelizeConfig);
}

console.log('[Sequelize Model Loader] Starting to load models...');
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      !file.startsWith('.') &&
      file !== basename &&
      file.endsWith('.js') &&
      !file.includes('.test.js')
    );
  })
  .forEach(file => {
    const modelPath = path.join(__dirname, file);
    console.log(`[Sequelize Model Loader] Attempting to load model from file: ${file}`);
    try {
      const modelFactory = require(modelPath);
      if (typeof modelFactory === 'function') {
        const model = modelFactory(sequelize, Sequelize.DataTypes);
        // Check if it's a class (function) and a subclass of Sequelize.Model and has a name
        if (model && typeof model === 'function' && model.prototype instanceof Sequelize.Model && model.name) {
          db[model.name] = model;
          console.log(`[Sequelize Model Loader] Successfully loaded model: ${model.name} from ${file}`);
        } else {
          let warningMessage = `[Sequelize Model Loader] File ${file} did not return a valid Sequelize model.`;
          if (model && model.name) warningMessage += ` Model name: ${model.name}.`;
          else if (model) warningMessage += ` Model loaded but 'name' property is missing or invalid.`;
          if (model && !(model.prototype instanceof Sequelize.Model)) warningMessage += ` Not an instance of Sequelize.Model.`;
          console.warn(warningMessage);
        }
      } else {
        console.warn(`[Sequelize Model Loader] File ${file} does not export a model factory function. Skipping.`);
      }
    } catch (error) {
      console.error(`[Sequelize Model Loader] Error loading model from ${file}: ${error.message}`);
      // console.error(error.stack); // Uncomment for more detailed stack trace
    }
  });

console.log('[Sequelize Model Loader] Finished loading models. Models in db object:', Object.keys(db));

// Explicitly check if Gym model is loaded correctly before associating
if (!db.Gym) {
  console.error("[Sequelize Model Loader] CRITICAL: Gym model was not found in the db object after loading phase. Associations involving Gym will likely fail.");
} else if (!(db.Gym.prototype instanceof Sequelize.Model)) {
  console.error("[Sequelize Model Loader] CRITICAL: db.Gym is present but is not a valid Sequelize Model class. Associations involving Gym will likely fail.");
  console.error("[Sequelize Model Loader] Content of db.Gym:", db.Gym);
} else {
  console.log("[Sequelize Model Loader] Gym model appears to be loaded correctly in db object.");
}

console.log('[Sequelize Model Loader] Starting to associate models...');
Object.keys(db).forEach(modelName => {
  const model = db[modelName];
  // Ensure the item in db is a valid model and has an associate method
  if (model && typeof model === 'function' && model.prototype instanceof Sequelize.Model && typeof model.associate === 'function') {
    console.log(`[Sequelize Model Loader] Associating model: ${modelName}`);
    try {
      model.associate(db); // Pass the db object which contains all loaded models
    } catch (error) {
      console.error(`[Sequelize Model Loader] Error associating model ${modelName}: ${error.message}`);
      // console.error(error.stack); // Uncomment for more detailed stack trace
    }
  } else {
    if (model && typeof model.associate === 'function') {
      console.warn(`[Sequelize Model Loader] Model ${modelName} has an 'associate' method but is not a valid Sequelize model (or not loaded correctly). Skipping association.`);
    } else if (model && !(model.prototype instanceof Sequelize.Model)) {
      // This case might be redundant if the loading phase filters correctly, but good for safety
      console.warn(`[Sequelize Model Loader] ${modelName} found in db object is not a valid Sequelize model. Skipping association.`);
    }
    // If model.associate doesn't exist, it's fine, just means no associations to set up for that model.
  }
});
console.log('[Sequelize Model Loader] Finished associating models.');

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
