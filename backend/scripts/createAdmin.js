/**
 * Creates (or updates the password of) the initial Club 37 admin account.
 *
 * Usage:
 *   1. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in your .env
 *   2. Run:  npm run create-admin
 *
 * This script never prints or logs the password, and the password is
 * hashed with bcrypt before being stored.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function run() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in .env before running this script.');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error('INITIAL_ADMIN_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const passwordHash = await Admin.hashPassword(password);
  const existing = await Admin.findOne({ email: email.toLowerCase().trim() });

  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated password for existing admin: ${email}`);
  } else {
    await Admin.create({ email: email.toLowerCase().trim(), passwordHash, role: 'SUPERADMIN' });
    console.log(`Created new admin: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
