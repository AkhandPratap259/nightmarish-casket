const jwt = require('jsonwebtoken');
module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET || 'dev-only-orbit-secret').id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
