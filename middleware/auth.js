// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Also check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.redirect('/login');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Add user to req object
    req.user = await User.findById(decoded.id);
    
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication failed. Please login again' });
  }
};

// Role authorization middleware
exports.authorize = (...roles) => {
    return (req, res, next) => {
      if (!req.user || (roles.includes('admin') && !req.user.isAdmin)) {
        return res.status(403).json({ 
          message: 'You do not have permission to access this resource' 
        });
      }
      next();
    };
  };