const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { handleProfilePhotoUpload } = require('../middleware/upload');
const applicationController = require('../controllers/applicationController');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many applications submitted. Please try again later.' }
});

const INSTAGRAM_REGEX = /^@?[a-zA-Z0-9._]{1,30}$/;

const applicationValidationRules = [
  body('name').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 100 }),
  body('age')
    .notEmpty()
    .withMessage('Age is required.')
    .isInt({ min: 16, max: 100 })
    .withMessage('Age must be a valid number between 16 and 100.'),
  body('city').trim().notEmpty().withMessage('City is required.').isLength({ max: 100 }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Enter a valid phone number.'),
  body('instagram')
    .optional({ checkFalsy: true })
    .trim()
    .matches(INSTAGRAM_REGEX)
    .withMessage('Enter a valid Instagram username.'),
  body('motorcycle').trim().notEmpty().withMessage('Motorcycle brand is required.').isLength({ max: 100 }),
  body('bikeModel').trim().notEmpty().withMessage('Bike model is required.').isLength({ max: 100 }),
  body('experience').trim().notEmpty().withMessage('Riding experience is required.').isLength({ max: 100 }),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Tell us why you want to join Club 37.')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be between 10 and 1000 characters.')
];

// Public
router.post(
  '/',
  submitLimiter,
  handleProfilePhotoUpload,
  applicationValidationRules,
  applicationController.submitApplication
);

module.exports = router;
