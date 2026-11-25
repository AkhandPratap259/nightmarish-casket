const jwt = require('jsonwebtoken');
const User = require('../models/User');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'homedraft-dev-secret-change-me');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    const user = await User.findById(req.userId);
    if (!user || !roles.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  };
}

module.exports = { auth, requireRole };
