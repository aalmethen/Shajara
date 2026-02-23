const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// Helper to attach is_admin flag from DB
async function attachAdminFlag(req) {
  if (req.user && req.user.id) {
    try {
      const { rows } = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.id]
      );
      req.user.isAdmin = rows.length > 0 && rows[0].is_admin === true;
    } catch {
      req.user.isAdmin = false;
    }
  }
}

// Required authentication — returns 401 if no valid token
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح - يرجى تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    await attachAdminFlag(req);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'رمز غير صالح أو منتهي الصلاحية' });
  }
}

// Optional authentication — attaches user if token present, continues otherwise
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    await attachAdminFlag(req);
  } catch (err) {
    req.user = null;
  }

  next();
}

module.exports = { requireAuth, optionalAuth };
