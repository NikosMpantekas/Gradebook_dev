const mongoose = require('mongoose');

const betaFeaturesSchema = new mongoose.Schema(
  {
    routes: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

betaFeaturesSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    console.log('[BetaFeatures] Creating default singleton document');
    doc = await this.create({ routes: {} });
  }
  return doc;
};

module.exports = mongoose.model('BetaFeatures', betaFeaturesSchema);
