const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Verifies the admin's JWT, which is stored in a secure, HTTP-only cookie
 * (never in frontend JavaScript or localStorage). Attaches req.admin on success.
 */
async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies && req.cookies.club37_admin_token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub).select('_id email role');

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    req.admin = admin;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized access.' });
  }
}

module.exports = { requireAdmin };
