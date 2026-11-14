const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Account not found' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Optional auth: attach req.user when a valid token is present, but never
// reject anonymous requests. Used for public reads that personalise output
// (for example the watched flag on a lot).
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(payload.id);
  } catch {
    req.user = null;
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action' });
    }
    return next();
  };
}

module.exports = { signToken, auth, optionalAuth, requireRole };
