const { validationResult } = require('express-validator');
const Application = require('../models/Application');
const Member = require('../models/Member');
const { generateApplicationId, generateMemberId } = require('../models/Counter');
const { uploadProfilePhoto } = require('../services/cloudinary');
const { notifyAdminOfNewApplication, notifyApplicantOfDecision } = require('../services/whatsapp');

// POST /api/applications (public)
async function submitApplication(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please check the form for errors.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }

  try {
    const { name, age, city, phone, instagram, motorcycle, bikeModel, experience, reason } = req.body;

    // Prevent duplicate applications: same phone number already pending.
    const existingPending = await Application.findOne({ phone, status: 'PENDING' });
    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'You already have an application under review.'
      });
    }

    let profilePhoto = { url: null, publicId: null };
    if (req.file && req.file.buffer) {
      const uploaded = await uploadProfilePhoto(req.file.buffer);
      if (uploaded) profilePhoto = uploaded;
    }

    const applicationId = await generateApplicationId();

    const application = await Application.create({
      applicationId,
      name,
      age,
      city,
      phone,
      instagram: instagram ? instagram.replace(/^@/, '') : '',
      motorcycle,
      bikeModel,
      experience,
      reason,
      profilePhoto,
      status: 'PENDING'
    });

    // Fire-and-forget: WhatsApp failure must never affect the stored application.
    notifyAdminOfNewApplication(application)
      .then(async () => {
        application.whatsappNotified = true;
        await application.save();
      })
      .catch((err) => {
        console.error('[whatsapp] Failed to notify admin of new application:', err.message);
      });

    return res.status(201).json({
      success: true,
      message: 'Your application has been received.',
      applicationId: application.applicationId
    });
  } catch (err) {
    console.error('[applications] submitApplication error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to submit your application. Please try again.'
    });
  }
}

// GET /api/admin/applications?status=PENDING (admin only)
async function listApplications(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      filter.status = status;
    }

    const applications = await Application.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, applications });
  } catch (err) {
    console.error('[applications] listApplications error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load applications.' });
  }
}

// GET /api/admin/applications/:id (admin only)
async function getApplicationById(req, res) {
  try {
    const application = await Application.findOne({ applicationId: req.params.id }).lean();
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    return res.json({ success: true, application });
  } catch (err) {
    console.error('[applications] getApplicationById error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load application.' });
  }
}

// POST /api/admin/applications/:id/approve (admin only)
async function approveApplication(req, res) {
  try {
    const application = await Application.findOne({ applicationId: req.params.id });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (application.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: 'This application has already been reviewed.' });
    }

    const existingMember = await Member.findOne({ applicationId: application.applicationId });
    if (existingMember) {
      return res.status(409).json({ success: false, message: 'A member already exists for this application.' });
    }

    const memberId = await generateMemberId();

    const member = await Member.create({
      memberId,
      applicationId: application.applicationId,
      name: application.name,
      age: application.age,
      city: application.city,
      phone: application.phone,
      instagram: application.instagram,
      motorcycle: application.motorcycle,
      bikeModel: application.bikeModel,
      experience: application.experience,
      profilePhoto: application.profilePhoto,
      joinedDate: new Date(),
      status: 'ACTIVE'
    });

    application.status = 'APPROVED';
    application.reviewedAt = new Date();
    application.reviewedBy = req.admin._id;
    await application.save();

    notifyApplicantOfDecision(application, 'APPROVED').catch((err) => {
      console.error('[whatsapp] Failed to notify applicant of approval:', err.message);
    });

    return res.json({
      success: true,
      message: 'Application approved and member created.',
      member
    });
  } catch (err) {
    console.error('[applications] approveApplication error:', err);
    return res.status(500).json({ success: false, message: 'Unable to approve this application.' });
  }
}

// POST /api/admin/applications/:id/reject (admin only)
async function rejectApplication(req, res) {
  try {
    const application = await Application.findOne({ applicationId: req.params.id });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (application.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: 'This application has already been reviewed.' });
    }

    application.status = 'REJECTED';
    application.reviewedAt = new Date();
    application.reviewedBy = req.admin._id;
    await application.save();

    notifyApplicantOfDecision(application, 'REJECTED').catch((err) => {
      console.error('[whatsapp] Failed to notify applicant of rejection:', err.message);
    });

    return res.json({ success: true, message: 'Application rejected.', application });
  } catch (err) {
    console.error('[applications] rejectApplication error:', err);
    return res.status(500).json({ success: false, message: 'Unable to reject this application.' });
  }
}

module.exports = {
  submitApplication,
  listApplications,
  getApplicationById,
  approveApplication,
  rejectApplication
};
