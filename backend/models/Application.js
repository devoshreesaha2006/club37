const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    age: { type: Number, required: true, min: 16, max: 100 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    instagram: { type: String, trim: true, maxlength: 60 },
    motorcycle: { type: String, required: true, trim: true, maxlength: 100 },
    bikeModel: { type: String, required: true, trim: true, maxlength: 100 },
    experience: { type: String, required: true, trim: true, maxlength: 100 },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    profilePhoto: {
      url: { type: String, default: null },
      publicId: { type: String, default: null }
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    whatsappNotified: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Helps prevent duplicate pending applications from the same phone number.
applicationSchema.index({ phone: 1, status: 1 });

module.exports = mongoose.model('Application', applicationSchema);
