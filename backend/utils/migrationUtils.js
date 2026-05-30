const logger = require("./logger");

// Placeholder for future migration utilities (non-permission related)
const placeholderMigration = async () => {
  logger.info("MIGRATION", "No active migrations available");
  return { success: true, message: "No migrations to run" };
};

module.exports = {
  placeholderMigration,
};
