const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_jwt_secret';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // التوكن عادة ما يكون بالشكل "Bearer <token>"
  const tokenParts = authHeader.split(' ');

  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Token is not valid (format error)' });
  }

  const token = tokenParts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // إرفاق معلومات المستخدم بالطلب لكي تتمكن المسارات المحمية من الوصول إليها
    // قد ترغب في جلب المستخدم من قاعدة البيانات هنا للتأكد من أنه لا يزال موجودًا ونشطًا
    const user = await userService.findUserById(decoded.id);

    // استخدام optional chaining (?.) للتحقق من user قبل الوصول إلى accountStatus
    if (user?.accountStatus !== 'ACTIVE') { 
        let message = 'User not found or account not active.';
        if (user) { 
            switch (user.accountStatus) {
                case 'PENDING_APPROVAL':
                    message = 'Account is pending approval.';
                    break;
                case 'INACTIVE':
                    message = 'Account is inactive.';
                    break;
                case 'SUSPENDED':
                    message = 'Account is suspended.';
                    break;
                case 'DELETED':
                    message = 'Account has been deleted.';
                    break;
                default:
                    message = `Account status is '${user.accountStatus}'. Access denied.`;
            }
        }
        // استخدام optional chaining هنا أيضًا
        return res.status(401).json({ message, accountStatus: user?.accountStatus }); 
    }

    req.user = user; 

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token is not valid (verification error)' });
    }
    // لأخطاء أخرى غير متوقعة أثناء التحقق من التوكن
    console.error('Token verification error:', err);
    return res.status(500).json({ message: 'Server error during token verification' });
  }
};

// Middleware للتحقق من الأدوار (اختياري ولكنه مفيد)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.role) { // استخدام optional chaining
      return res.status(403).json({ message: 'Access denied. User role not available.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Role '${req.user.role}' is not authorized for this resource.`
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken: authMiddleware, // تم تغيير الاسم ليكون أوضح
  authorizeRoles
};
