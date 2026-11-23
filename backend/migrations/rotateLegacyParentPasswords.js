const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const User = require('../models/userModel');

async function rotateLegacyParentPasswords(apply) {
  let matched = 0;
  let rotated = 0;
  for await (const parent of User.find({ role: 'parent' }).select('password').lean().cursor()) {
    if (!await bcrypt.compare('TempPass123!', parent.password)) continue;
    matched++;
    if (apply) {
      const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      const result = await User.updateOne(
        { _id: parent._id, role: 'parent', password: parent.password },
        { $set: { password, requirePasswordChange: true, lastPasswordChange: new Date(), sessionsRevokedAt: new Date() } }
      );
      rotated += result.modifiedCount;
    }
  }
  return { matched, rotated };
}

if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => rotateLegacyParentPasswords(process.argv.includes('--apply')))
    .then(console.log)
    .catch(() => { console.error('Parent password migration failed'); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}

module.exports = rotateLegacyParentPasswords;
