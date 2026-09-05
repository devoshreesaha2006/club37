const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true, unique: true, index: true },
    applicationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    age: { type: Number, required: true },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    instagram: { type: String, trim: true, maxlength: 60 },
    motorcycle: { type: String, required: true, trim: true, maxlength: 100 },
    bikeModel: { type: String, required: true, trim: true, maxlength: 100 },
    experience: { type: String, required: true, trim: true, maxlength: 100 },
    profilePhoto: {
      url: { type: String, default: null },
      publicId: { type: String, default: null }
    },
    joinedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ACTIVE', 'REMOVED'],
      default: 'ACTIVE',
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);
