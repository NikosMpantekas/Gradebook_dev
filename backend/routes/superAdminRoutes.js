const express = require("express");
const PushSubscription = require("../models/pushSubscriptionModel");
const asyncHandler = require("../utils/asyncHandler");
const router = express.Router();
const {
  createSchoolOwner,
  getSchoolOwners,
  getSchoolOwnerById,
  updateSchoolOwnerStatus,
  updateAdminPack,
  createFirstSuperAdmin,
  sendSuperAdminNotification,
  getSchoolsForNotifications,
  searchUsersForNotifications,
  getSystemLogs,
  getPM2Status,
  deleteSchoolOwner,
  updateSchoolOwnerPermissions,
} = require("../controllers/superAdminController");
const { protect, superadmin } = require("../middleware/authMiddleware");

// Public route for creating the first superadmin (only works if no superadmin exists)
router.post("/create-first-superadmin", createFirstSuperAdmin);

// Protected routes
router.use(protect);
router.use(superadmin);

router.post("/create-school-owner", createSchoolOwner);
router.get("/school-owners", getSchoolOwners);
router.get("/school-owners/:id", getSchoolOwnerById);
router.put("/school-owners/:id/status", updateSchoolOwnerStatus);
router.put("/school-owners/:id/pack", updateAdminPack);
router.delete("/school-owners/:id", deleteSchoolOwner);
router.put("/school-owner/:id/permissions", updateSchoolOwnerPermissions);

// Superadmin notification routes
router.post("/notifications", sendSuperAdminNotification);
router.get("/schools", getSchoolsForNotifications);
router.get("/users/search", searchUsersForNotifications);

// System logs routes
router.get("/push-subscriptions/shared", asyncHandler(async (_, res) => {
  const shared = await PushSubscription.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$endpoint", users: { $addToSet: "$userId" } } },
    { $match: { "users.1": { $exists: true } } },
    { $project: { _id: 0, users: 1 } }
  ]);
  res.json(shared);
}));

router.get("/logs", getSystemLogs);
router.get("/pm2-status", getPM2Status);

module.exports = router;
