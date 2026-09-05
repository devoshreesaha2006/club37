const express = require('express');
const memberController = require('../controllers/memberController');

const router = express.Router();

// GET /api/members — public, ACTIVE members only (enforced in controller)
router.get('/', memberController.listPublicMembers);

module.exports = router;
