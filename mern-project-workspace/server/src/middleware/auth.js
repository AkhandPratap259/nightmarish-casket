const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET || 'dev-only-flowboard-secret-change-in-production',
    { expiresIn: '7d' }
  );
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in required' });
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-only-flowboard-secret-change-in-production'
    );
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Sign in required' });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signToken, requireAuth };
