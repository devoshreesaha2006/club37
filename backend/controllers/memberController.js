const Member = require('../models/Member');
const { deleteProfilePhoto } = require('../services/cloudinary');

// GET /api/members (public) — ONLY active, approved members. Never leaks
// pending or rejected applicants.
async function listPublicMembers(req, res) {
  try {
    const members = await Member.find({ status: 'ACTIVE' })
      .select('memberId name city motorcycle bikeModel instagram profilePhoto joinedDate')
      .sort({ joinedDate: -1 })
      .lean();

    return res.json({ success: true, members });
  } catch (err) {
    console.error('[members] listPublicMembers error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load members.' });
  }
}

// GET /api/admin/members (admin only) — all members, any status.
async function listAllMembers(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['ACTIVE', 'REMOVED'].includes(status)) {
      filter.status = status;
    }

    const members = await Member.find(filter).sort({ joinedDate: -1 }).lean();
    return res.json({ success: true, members });
  } catch (err) {
    console.error('[members] listAllMembers error:', err);
    return res.status(500).json({ success: false, message: 'Unable to load members.' });
  }
}

// PATCH /api/admin/members/:id (admin only) — edit member info or restore/remove.
const EDITABLE_FIELDS = ['name', 'age', 'city', 'phone', 'instagram', 'motorcycle', 'bikeModel', 'experience', 'status'];

async function updateMember(req, res) {
  try {
    const member = await Member.findOne({ memberId: req.params.id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (field === 'status' && !['ACTIVE', 'REMOVED'].includes(req.body.status)) {
          continue;
        }
        member[field] = req.body[field];
      }
    }

    await member.save();
    return res.json({ success: true, message: 'Member updated.', member });
  } catch (err) {
    console.error('[members] updateMember error:', err);
    return res.status(500).json({ success: false, message: 'Unable to update member.' });
  }
}

// DELETE /api/admin/members/:id (admin only) — soft delete by default
// (status = REMOVED). Pass ?hard=true to permanently delete the record.
async function removeMember(req, res) {
  try {
    const member = await Member.findOne({ memberId: req.params.id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    if (req.query.hard === 'true') {
      await deleteProfilePhoto(member.profilePhoto && member.profilePhoto.publicId);
      await member.deleteOne();
      return res.json({ success: true, message: 'Member permanently deleted.' });
    }

    member.status = 'REMOVED';
    await member.save();
    return res.json({ success: true, message: 'Member removed.', member });
  } catch (err) {
    console.error('[members] removeMember error:', err);
    return res.status(500).json({ success: false, message: 'Unable to remove member.' });
  }
}

module.exports = { listPublicMembers, listAllMembers, updateMember, removeMember };
