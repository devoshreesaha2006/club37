const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Application = require('../models/Application');
const Member = require('../models/Member');

function signToken(admin) {
  return jwt.sign({ sub: admin._id.toString(), role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: "/",
  };
}

// POST /api/admin/login
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Unauthorized access.' });
  }

  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    // Same generic message whether the email or password is wrong,
    // to avoid leaking which admin accounts exist.
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const token = signToken(admin);
    res.cookie('club37_admin_token', token, cookieOptions());

    return res.json({
      success: true,
      message: 'Logged in.',
      admin: { id: admin._id, email: admin.email, role: admin.role }
    });
  } catch (err) {
    console.error('[admin] login error:', err);
    return res.status(500).json({ success: false, message: 'Unable to log in. Please try again.' });
  }
}

// POST /api/admin/logout
function logout(req, res) {
  res.clearCookie('club37_admin_token', cookieOptions());
  return res.json({ success: true, message: 'Logged out.' });
}

// GET /api/admin/me
function me(req, res) {
  return res.json({ success: true, admin: req.admin });
}

// GET /api/admin/stats
async function stats(req, res) {
  try {
    const [pending, approved, rejected, totalMembers] = await Promise.all([
      Application.countDocuments({ status: 'PENDING' }),
      Application.countDocuments({ status: 'APPROVED' }),
      Application.countDocuments({ status: 'REJECTED' }),
      Member.countDocuments({ status: 'ACTIVE' })
    ]);

    return res.json({
      success: true,
      stats: { pending, approved, rejected, totalMembers }
    });
  } catch (err) {
    console.error('[admin] stats error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load statistics.' });
  }
}

module.exports = { login, logout, me, stats };
