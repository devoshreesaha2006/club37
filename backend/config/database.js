const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[database] MONGODB_URI is not set in the environment. Refusing to start.');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    console.log('[database] Connected to MongoDB Atlas');
  } catch (err) {
    console.error('[database] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[database] MongoDB connection lost');
  });
}

module.exports = connectDatabase;
