const mongoose = require('mongoose');

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
});

module.exports = mongoose.model('RefreshSession', refreshSessionSchema);
