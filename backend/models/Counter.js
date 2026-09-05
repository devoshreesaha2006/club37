const mongoose = require('mongoose');

// A generic atomic counter collection used to generate sequential,
// collision-free IDs (application IDs, member IDs) on the backend only.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "applicationId" or "memberId"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequence number for a given key.
 * Using findOneAndUpdate with $inc + upsert guarantees no two concurrent
 * requests can ever receive the same number.
 */
async function getNextSequence(key) {
  const result = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

function pad(num, size) {
  return String(num).padStart(size, '0');
}

async function generateApplicationId() {
  const n = await getNextSequence('applicationId');
  return `C37-REQ-${pad(n, 4)}`;
}

async function generateMemberId() {
  const n = await getNextSequence('memberId');
  return `C37-${pad(n, 4)}`;
}

module.exports = { Counter, getNextSequence, generateApplicationId, generateMemberId };
