const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const applicationController = require('../controllers/applicationController');
const memberController = require('../controllers/memberController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

// --- Auth ---
router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().withMessage('Valid email required.'), body('password').notEmpty().withMessage('Password required.')],
  adminController.login
);
router.post('/logout', requireAdmin, adminController.logout);
router.get('/me', requireAdmin, adminController.me);
router.get('/stats', requireAdmin, adminController.stats);

// --- Applications (admin) ---
router.get('/applications', requireAdmin, applicationController.listApplications);
router.get('/applications/:id', requireAdmin, applicationController.getApplicationById);
router.post('/applications/:id/approve', requireAdmin, applicationController.approveApplication);
router.post('/applications/:id/reject', requireAdmin, applicationController.rejectApplication);

// --- Members (admin) ---
router.get('/members', requireAdmin, memberController.listAllMembers);
router.patch('/members/:id', requireAdmin, memberController.updateMember);
router.delete('/members/:id', requireAdmin, memberController.removeMember);

module.exports = router;
