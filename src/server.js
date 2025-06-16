require('dotenv').config(); // لتحميل متغيرات البيئة في البداية
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./models');
const authRoutes = require('./routes/authRoutes');
const gymRoutes = require('./routes/gymRoutes');
const branchRoutes = require('./routes/branchRoutes');
const membershipPlanRoutes = require('./routes/membershipPlanRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const trainingClassTypeRoutes = require('./routes/trainingClassTypeRoutes');
const scheduledSessionRoutes = require('./routes/scheduledSessionRoutes');
const memberSubscriptionRoutes = require('./routes/memberSubscriptionRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes'); // تمت الإضافة

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/membership-plans', membershipPlanRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/class-types', trainingClassTypeRoutes);
app.use('/api/scheduled-sessions', scheduledSessionRoutes);
app.use('/api/subscriptions', memberSubscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes); // تمت الإضافة
// ... الخ

// Test route
app.get('/', (req, res) => {
  res.send('Gym SaaS API is running!');
});

const PORT = process.env.PORT || 3001;

db.sequelize.sync() // يمكنك استخدام { force: true } لإعادة إنشاء الجداول في كل مرة (للتطوير فقط)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
      console.log('Database connected successfully.');
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
