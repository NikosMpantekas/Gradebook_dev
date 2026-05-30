const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ratingController = require("../controllers/ratingController");

// Rating Periods management
router.post("/periods", protect, ratingController.createRatingPeriod);
router.get("/periods", protect, ratingController.getRatingPeriods);
router.get("/periods/:id", protect, ratingController.getRatingPeriod);
router.put("/periods/:id", protect, ratingController.updateRatingPeriod);
router.delete("/periods/:id", protect, ratingController.deleteRatingPeriod);

// Embedded questions in period routes
router.post("/periods/:id/questions", protect, ratingController.addQuestionToPeriod);
router.put("/periods/:periodId/questions/:questionId", protect, ratingController.updateQuestionInPeriod);
router.delete("/periods/:periodId/questions/:questionId", protect, ratingController.removeQuestionFromPeriod);

// Flat questions endpoints (matching frontend API call patterns)
router.post("/questions", protect, ratingController.createRatingQuestion);
router.put("/questions/:questionId", protect, ratingController.updateQuestionInPeriod);
router.delete("/questions/:questionId", protect, ratingController.removeQuestionFromPeriod);

// Student targets and submission actions
router.get("/active", protect, ratingController.getActiveRatingPeriods);
router.get("/targets", protect, ratingController.getRatingTargets);
router.get("/check/:periodId/:targetType/:targetId", protect, ratingController.checkStudentRating);
router.post("/submit", protect, ratingController.submitRating);

// Rating statistics
router.get("/stats/:targetType/:targetId", protect, ratingController.getRatingStats);
router.get("/stats", protect, ratingController.getRatingStatsSummary);

// Questions retrieval
router.get("/questions/:periodId", protect, ratingController.getRatingQuestionsForAdmin);
router.get("/period/:periodId/questions", protect, ratingController.getRatingQuestionsForStudent);

module.exports = router;
