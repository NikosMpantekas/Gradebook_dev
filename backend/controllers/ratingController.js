const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const { RatingPeriod, StudentRating } = require("../models/ratingModel");
const User = require("../models/userModel");
const Subject = require("../models/subjectModel");
const logger = require("../utils/logger");

// Create a rating period with embedded questions
const createRatingPeriod = asyncHandler(async (req, res) => {
  const { title, description, startDate, endDate, targetType, directions, questions } = req.body;

  if (!req.isSuperadmin && !req.schoolId) {
    res.status(403);
    throw new Error("School context required for creating rating periods");
  }

  if (!title || !startDate || !endDate) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    res.status(400);
    throw new Error("End date must be after start date");
  }

  let schoolsToAssign = [];
  if (!req.isSuperadmin) {
    schoolsToAssign = [req.schoolId];
  } else if (req.body.schools && req.body.schools.length > 0) {
    schoolsToAssign = req.body.schools;
  }

  const ratingPeriod = await RatingPeriod.create({
    title,
    description,
    startDate: start,
    endDate: end,
    targetType: targetType || "both",
    schools: schoolsToAssign,
    directions: directions || [],
    isActive: false,
    questions: questions || [],
    createdBy: req.user._id,
    creatingSchool: req.schoolId || null
  });

  if (ratingPeriod) {
    res.status(201).json(ratingPeriod);
  } else {
    res.status(400);
    throw new Error("Invalid rating period data");
  }
});

// Get all rating periods
const getRatingPeriods = asyncHandler(async (req, res) => {
  if (!req.isSuperadmin && !req.schoolId) {
    res.status(403);
    throw new Error("School context required for accessing rating periods");
  }

  let query = {};
  if (!req.isSuperadmin) {
    query = {
      $or: [
        { schools: req.schoolId },
        { "schools.0": { $exists: false } }
      ]
    };
  }

  const ratingPeriods = await RatingPeriod.find(query)
    .populate("schools", "name")
    .populate("directions", "name")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(ratingPeriods);
});

// Get a single rating period
const getRatingPeriod = asyncHandler(async (req, res) => {
  if (!req.isSuperadmin && !req.schoolId) {
    res.status(403);
    throw new Error("School context required for accessing rating periods");
  }

  const query = { _id: req.params.id };
  if (!req.isSuperadmin) {
    query.$or = [
      { schools: req.schoolId },
      { "schools.0": { $exists: false } }
    ];
  }

  const ratingPeriod = await RatingPeriod.findOne(query)
    .populate("schools", "name")
    .populate("directions", "name")
    .populate("createdBy", "name email")
    .lean();

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  res.status(200).json(ratingPeriod);
});

// Update a rating period
const updateRatingPeriod = asyncHandler(async (req, res) => {
  const { title, description, startDate, endDate, isActive, targetType, directions, questions } = req.body;

  if (!req.isSuperadmin && !req.schoolId) {
    res.status(403);
    throw new Error("School context required for managing rating periods");
  }

  const query = { _id: req.params.id };
  if (!req.isSuperadmin) {
    query.$or = [
      { schools: req.schoolId },
      { creatingSchool: req.schoolId },
      {
        $and: [
          { "schools.0": { $exists: false } },
          { isGlobal: true }
        ]
      }
    ];
  }

  const ratingPeriod = await RatingPeriod.findOne(query);

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const start = startDate ? new Date(startDate) : ratingPeriod.startDate;
  const end = endDate ? new Date(endDate) : ratingPeriod.endDate;

  if (start >= end) {
    res.status(400);
    throw new Error("End date must be after start date");
  }

  ratingPeriod.title = title !== undefined ? title : ratingPeriod.title;
  ratingPeriod.description = description !== undefined ? description : ratingPeriod.description;
  ratingPeriod.startDate = start;
  ratingPeriod.endDate = end;
  ratingPeriod.isActive = isActive !== undefined ? isActive : ratingPeriod.isActive;
  ratingPeriod.targetType = targetType || ratingPeriod.targetType;

  if (!req.isSuperadmin) {
    ratingPeriod.schools = [req.schoolId];
  } else if (req.body.schools) {
    ratingPeriod.schools = req.body.schools;
  }

  if (directions) ratingPeriod.directions = directions;
  if (questions) ratingPeriod.questions = questions;

  const now = new Date();
  if (end < now && ratingPeriod.isActive) {
    ratingPeriod.isActive = false;
  }

  const updatedRatingPeriod = await ratingPeriod.save();
  res.status(200).json(updatedRatingPeriod);
});

// Delete a rating period
const deleteRatingPeriod = asyncHandler(async (req, res) => {
  if (!req.isSuperadmin && !req.schoolId) {
    res.status(403);
    throw new Error("School context required for managing rating periods");
  }

  const query = { _id: req.params.id };
  if (!req.isSuperadmin) {
    query.$or = [
      { schools: req.schoolId },
      { creatingSchool: req.schoolId }
    ];
  }

  const ratingPeriod = await RatingPeriod.findOne(query);

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  await StudentRating.deleteMany({ ratingPeriod: req.params.id });
  await RatingPeriod.deleteOne({ _id: ratingPeriod._id });

  res.status(200).json({ message: "Rating period removed" });
});

// Add a question to an existing rating period
const addQuestionToPeriod = asyncHandler(async (req, res) => {
  const { text, questionType, targetType, order } = req.body;

  if (!text) {
    res.status(400);
    throw new Error("Question text is required");
  }

  const ratingPeriod = await RatingPeriod.findById(req.params.id);

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const newQuestion = {
    text,
    questionType: questionType || "rating",
    targetType: targetType || "both",
    order: order || ratingPeriod.questions.length
  };

  ratingPeriod.questions.push(newQuestion);
  await ratingPeriod.save();

  res.status(201).json(ratingPeriod);
});

// Create a new rating question
const createRatingQuestion = asyncHandler(async (req, res) => {
  const { text, questionType, targetType, order, ratingPeriod: periodId } = req.body;

  if (!text) {
    res.status(400);
    throw new Error("Question text is required");
  }

  if (!periodId) {
    res.status(400);
    throw new Error("Rating period ID is required");
  }

  const ratingPeriod = await RatingPeriod.findById(periodId);

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const newQuestion = {
    text,
    questionType: questionType || "rating",
    targetType: targetType || "both",
    order: order !== undefined ? order : ratingPeriod.questions.length
  };

  ratingPeriod.questions.push(newQuestion);
  const updatedPeriod = await ratingPeriod.save();
  const createdQuestion = updatedPeriod.questions[updatedPeriod.questions.length - 1];

  res.status(201).json(createdQuestion);
});

// Update a specific question within a rating period (Unified for /periods/:periodId/questions/:questionId and /questions/:questionId)
const updateQuestionInPeriod = asyncHandler(async (req, res) => {
  const { text, questionType, targetType, order, ratingPeriod: periodId } = req.body;
  const targetPeriodId = periodId || req.params.periodId;

  if (!targetPeriodId) {
    res.status(400);
    throw new Error("Rating period ID is required");
  }

  const ratingPeriod = await RatingPeriod.findById(targetPeriodId);

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const questionIndex = ratingPeriod.questions.findIndex(
    (q) => q._id.toString() === req.params.questionId
  );

  if (questionIndex === -1) {
    res.status(404);
    throw new Error("Question not found in this rating period");
  }

  if (text) ratingPeriod.questions[questionIndex].text = text;
  if (questionType) ratingPeriod.questions[questionIndex].questionType = questionType;
  if (targetType) ratingPeriod.questions[questionIndex].targetType = targetType;
  if (order !== undefined) ratingPeriod.questions[questionIndex].order = order;

  await ratingPeriod.save();
  res.status(200).json(ratingPeriod.questions[questionIndex]);
});

// Remove a question from a rating period
const removeQuestionFromPeriod = asyncHandler(async (req, res) => {
  const questionId = req.params.questionId;
  const periodId = req.params.periodId;
  
  let ratingPeriod;
  if (periodId) {
    ratingPeriod = await RatingPeriod.findById(periodId);
  } else {
    ratingPeriod = await RatingPeriod.findOne({ "questions._id": questionId });
  }

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period or question not found");
  }

  ratingPeriod.questions = ratingPeriod.questions.filter(
    (q) => q._id.toString() !== questionId
  );

  await ratingPeriod.save();
  res.status(200).json({ message: "Question removed successfully" });
});

// Get active rating periods for students
const getActiveRatingPeriods = asyncHandler(async (req, res) => {
  if (!req.schoolId) {
    res.status(403);
    throw new Error("School context required for accessing rating periods");
  }

  const now = new Date();
  const studentDirection = req.user.direction ? req.user.direction._id || req.user.direction : null;

  const queryConditions = [
    { schools: req.schoolId },
    { "schools.0": { $exists: false }, isGlobal: true }
  ];

  if (studentDirection) {
    queryConditions.push({
      directions: studentDirection,
      $or: [
        { schools: req.schoolId },
        { "schools.0": { $exists: false } }
      ]
    });
  }

  const activePeriods = await RatingPeriod.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: queryConditions
  })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(activePeriods);
});

// Get available rating targets for a student
const getRatingTargets = asyncHandler(async (req, res) => {
  const { periodId } = req.query;

  if (!periodId) {
    res.status(400);
    throw new Error("Rating period ID is required");
  }

  if (!req.schoolId) {
    res.status(403);
    throw new Error("School context required for accessing rating targets");
  }

  const ratingPeriod = await RatingPeriod.findById(periodId).lean();

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const now = new Date();
  if (!ratingPeriod.isActive || now < ratingPeriod.startDate || now > ratingPeriod.endDate) {
    res.status(403);
    throw new Error("Rating period is not active");
  }

  const studentSchool = req.schoolId;
  const studentDirection = req.user.direction ? req.user.direction._id || req.user.direction : null;

  const existingRatings = await StudentRating.find({
    student: req.user._id,
    ratingPeriod: periodId
  }).lean();

  const ratedTeacherIds = existingRatings
    .filter((r) => r.targetType === "teacher")
    .map((r) => r.targetId.toString());

  const ratedSubjectIds = existingRatings
    .filter((r) => r.targetType === "subject")
    .map((r) => r.targetId.toString());

  const response = {
    teachers: [],
    subjects: []
  };

  // Fetch teachers (tiered query strategy)
  if (ratingPeriod.targetType === "both" || ratingPeriod.targetType === "teacher") {
    try {
      let teachers = [];
      const teacherIds = new Set();

      if (studentSchool || studentDirection) {
        const subjectQuery = { school: studentSchool };
        if (studentDirection) {
          subjectQuery.$or = [
            { direction: studentDirection },
            { directions: studentDirection }
          ];
        }

        const studentSubjects = await Subject.find(subjectQuery)
          .select("_id teachers")
          .lean();

        studentSubjects.forEach((sub) => {
          if (sub.teachers && Array.isArray(sub.teachers)) {
            sub.teachers.forEach((tid) => teacherIds.add(tid.toString()));
          }
        });
      }

      if (teacherIds.size > 0) {
        teachers = await User.find({
          role: "teacher",
          _id: { $in: Array.from(teacherIds) }
        })
          .select("_id name email")
          .lean();
      }

      if (teachers.length === 0 && studentSchool) {
        teachers = await User.find({
          role: "teacher",
          $or: [{ school: studentSchool }, { schools: studentSchool }]
        })
          .select("_id name email")
          .lean();
      }

      if (teachers.length === 0) {
        teachers = await User.find({ role: "teacher" })
          .select("_id name email")
          .lean();
      }

      response.teachers = teachers.filter(
        (t) => !ratedTeacherIds.includes(t._id.toString())
      );
    } catch (error) {
      logger.error("RATING", "Error fetching teachers for target selection", { error: error.message });
      response.teachers = [];
    }
  }

  // Fetch subjects
  if (ratingPeriod.targetType === "both" || ratingPeriod.targetType === "subject") {
    try {
      const studentWithSubjects = await User.findById(req.user._id)
        .select("subjects")
        .lean();

      if (studentWithSubjects && studentWithSubjects.subjects && studentWithSubjects.subjects.length > 0) {
        const enrolledSubjectIds = studentWithSubjects.subjects.map((sid) => sid.toString());

        const subjects = await Subject.find({
          _id: { $in: enrolledSubjectIds }
        })
          .select("_id name")
          .lean();

        response.subjects = subjects.filter(
          (s) => !ratedSubjectIds.includes(s._id.toString())
        );
      }
    } catch (error) {
      logger.error("RATING", "Error fetching subjects for target selection", { error: error.message });
      response.subjects = [];
    }
  }

  res.status(200).json(response);
});

// Check if student has already rated a target
const checkStudentRating = asyncHandler(async (req, res) => {
  const { periodId, targetType, targetId } = req.params;

  const existingRating = await StudentRating.findOne({
    student: req.user._id,
    ratingPeriod: periodId,
    targetType,
    targetId
  }).lean();

  res.status(200).json({
    hasRated: !!existingRating,
    ratingId: existingRating ? existingRating._id : null
  });
});

// Submit a rating
const submitRating = asyncHandler(async (req, res) => {
  const { ratingPeriod, ratingPeriodId, targetType, targetId, answers } = req.body;

  if (!req.schoolId) {
    res.status(403);
    throw new Error("School context required for submitting ratings");
  }

  const periodId = ratingPeriod || ratingPeriodId;

  if (!periodId || !targetType || !targetId || !answers || !Array.isArray(answers) || answers.length === 0) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const periodRecord = await RatingPeriod.findById(periodId);
  if (!periodRecord) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const now = new Date();
  if (!periodRecord.isActive || now < periodRecord.startDate || now > periodRecord.endDate) {
    res.status(400);
    throw new Error("Rating period is not active");
  }

  if (targetType === "teacher") {
    const teacher = await User.findById(targetId).lean();
    if (!teacher) {
      res.status(404);
      throw new Error("Teacher not found");
    }
  } else if (targetType === "subject") {
    const subject = await Subject.findById(targetId).lean();
    if (!subject) {
      res.status(404);
      throw new Error("Subject not found");
    }
  } else {
    res.status(400);
    throw new Error("Invalid target type");
  }

  const existingRating = await StudentRating.findOne({
    student: req.user._id,
    ratingPeriod: periodId,
    targetType,
    targetId
  }).lean();

  if (existingRating) {
    res.status(400);
    throw new Error("You have already rated this target for this period");
  }

  const processedAnswers = answers.map((answer, index) => {
    if (!answer || typeof answer !== "object" || !answer.question) {
      throw new Error(`Answer at index ${index} is invalid`);
    }

    const question = periodRecord.questions.id(answer.question);
    if (!question) {
      throw new Error(`Question with ID ${answer.question} not found`);
    }

    if (question.questionType === "rating") {
      if (answer.ratingValue === undefined || answer.ratingValue === null) {
        throw new Error(`Rating value is required for question: "${question.text}"`);
      }
      if (typeof answer.ratingValue !== "number" || answer.ratingValue < 1 || answer.ratingValue > 5) {
        throw new Error(`Rating value must be a number between 1 and 5 for question: "${question.text}"`);
      }
    }

    return {
      questionId: answer.question,
      questionText: question.text,
      ratingValue: answer.ratingValue !== undefined ? answer.ratingValue : null,
      textAnswer: answer.textAnswer || ""
    };
  });

  const studentSchool = req.schoolId;
  const studentDirection = req.user.direction ? req.user.direction._id || req.user.direction : null;

  if (!req.isSuperadmin) {
    const validPeriod = await RatingPeriod.findOne({
      _id: periodId,
      $or: [
        { schools: req.schoolId },
        { "schools.0": { $exists: false } }
      ]
    }).lean();

    if (!validPeriod) {
      res.status(403);
      throw new Error("You do not have permission to submit ratings for this period");
    }

    if (targetType === "teacher") {
      const teacherCheck = await User.findOne({
        _id: targetId,
        $or: [
          { schoolId: req.schoolId },
          { school: req.schoolId },
          { schools: req.schoolId }
        ]
      }).lean();

      if (!teacherCheck) {
        res.status(403);
        throw new Error("You do not have permission to rate this teacher");
      }
    } else if (targetType === "subject") {
      const subjectCheck = await Subject.findOne({
        _id: targetId,
        $or: [
          { schoolId: req.schoolId },
          { school: req.schoolId }
        ]
      }).lean();

      if (!subjectCheck) {
        res.status(403);
        throw new Error("You do not have permission to rate this subject");
      }
    }
  }

  const studentRating = await StudentRating.create({
    student: req.user._id,
    ratingPeriod: periodId,
    targetType,
    targetId,
    targetModel: targetType === "teacher" ? "User" : "Subject",
    answers: processedAnswers,
    school: studentSchool,
    direction: studentDirection
  });

  res.status(201).json(studentRating);
});

// Get rating statistics for a target
const getRatingStats = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;
  const { periodId } = req.query;

  const query = { targetType, targetId };
  if (periodId) {
    query.ratingPeriod = periodId;
  }

  const ratings = await StudentRating.find(query)
    .populate("student", "name")
    .lean();

  const stats = {
    totalRatings: ratings.length,
    averageRating: 0,
    questionStats: [],
    textFeedback: [],
    periodBreakdown: {}
  };

  const questionMap = new Map();

  ratings.forEach((rating) => {
    const pId = rating.ratingPeriod.toString();
    if (!stats.periodBreakdown[pId]) {
      stats.periodBreakdown[pId] = {
        count: 0,
        averageRating: 0,
        totalRatingValue: 0,
        ratingCount: 0
      };
    }
    stats.periodBreakdown[pId].count++;

    rating.answers.forEach((answer) => {
      const qId = answer.questionId.toString();

      if (!questionMap.has(qId)) {
        questionMap.set(qId, {
          questionId: qId,
          questionText: answer.questionText,
          totalRatingValue: 0,
          ratingCount: 0,
          averageRating: 0,
          textAnswers: []
        });
      }

      const qStats = questionMap.get(qId);

      if (answer.ratingValue) {
        qStats.totalRatingValue += answer.ratingValue;
        qStats.ratingCount++;

        stats.periodBreakdown[pId].totalRatingValue += answer.ratingValue;
        stats.periodBreakdown[pId].ratingCount++;
      }

      if (answer.textAnswer) {
        qStats.textAnswers.push({
          student: rating.student ? rating.student.name : "Anonymous",
          answer: answer.textAnswer,
          date: rating.createdAt
        });

        stats.textFeedback.push({
          question: answer.questionText,
          student: rating.student ? rating.student.name : "Anonymous",
          answer: answer.textAnswer,
          date: rating.createdAt
        });
      }
    });
  });

  let totalRatingSum = 0;
  let totalRatingCount = 0;

  questionMap.forEach((qStat) => {
    if (qStat.ratingCount > 0) {
      qStat.averageRating = qStat.totalRatingValue / qStat.ratingCount;
      totalRatingSum += qStat.totalRatingValue;
      totalRatingCount += qStat.ratingCount;
    }
  });

  if (totalRatingCount > 0) {
    stats.averageRating = totalRatingSum / totalRatingCount;
  }

  Object.keys(stats.periodBreakdown).forEach((pId) => {
    const pStats = stats.periodBreakdown[pId];
    if (pStats.ratingCount > 0) {
      pStats.averageRating = pStats.totalRatingValue / pStats.ratingCount;
    }
  });

  stats.questionStats = Array.from(questionMap.values());
  res.status(200).json(stats);
});

// Get rating statistics summary for all targets (Admin overview)
const getRatingStatsSummary = asyncHandler(async (req, res) => {
  const { periodId, targetType } = req.query;

  if (!req.isSuperadmin && !req.schoolId) {
    res.status(403);
    throw new Error("School context required for accessing rating statistics");
  }

  const query = {};
  if (!req.isSuperadmin) {
    query.school = req.schoolId;
  }

  if (periodId) {
    query.ratingPeriod = periodId;

    if (!req.isSuperadmin) {
      const periodSchoolCheck = await RatingPeriod.findOne({
        _id: periodId,
        $or: [
          { schools: req.schoolId },
          { "schools.0": { $exists: false } }
        ]
      }).lean();

      if (!periodSchoolCheck) {
        res.status(403);
        throw new Error("You do not have permission to access this rating period");
      }
    }
  }

  if (targetType && (targetType === "teacher" || targetType === "subject")) {
    query.targetType = targetType;
  }

  let questions = [];
  if (periodId) {
    const ratingPeriod = await RatingPeriod.findById(periodId).lean();
    if (ratingPeriod && ratingPeriod.questions) {
      questions = ratingPeriod.questions;
    }
  }

  const ratings = await StudentRating.find(query)
    .populate("school", "name")
    .populate("direction", "name")
    .populate("student", "name direction school")
    .lean();

  const targetsMap = new Map();

  ratings.forEach((rating) => {
    const targetKey = `${rating.targetType}-${rating.targetId.toString()}`;

    if (!targetsMap.has(targetKey)) {
      targetsMap.set(targetKey, {
        targetId: rating.targetId,
        targetType: rating.targetType,
        totalRatingValue: 0,
        ratingCount: 0,
        averageRating: 0,
        totalRatings: 0,
        name: null,
        questionStats: {}
      });
    }

    const targetStats = targetsMap.get(targetKey);
    targetStats.totalRatings++;

    rating.answers.forEach((answer) => {
      const qIdStr = answer.questionId.toString();

      if (!targetStats.questionStats[qIdStr]) {
        targetStats.questionStats[qIdStr] = {
          questionId: qIdStr,
          questionText: answer.questionText || "",
          totalValue: 0,
          count: 0,
          average: 0,
          hasTextResponses: !!answer.textAnswer,
          textResponseCount: answer.textAnswer ? 1 : 0,
          schools: {},
          directions: {},
          textResponses: answer.textAnswer
            ? [
                {
                  text: answer.textAnswer,
                  school: rating.school ? rating.school.name || "Unknown School" : "Unknown School",
                  schoolId: rating.school ? rating.school._id || rating.school : null,
                  direction: rating.direction ? rating.direction.name || "Unknown Direction" : "Unknown Direction",
                  directionId: rating.direction ? rating.direction._id || rating.direction : null,
                  student: rating.student ? rating.student.name : "Anonymous Student",
                  date: rating.createdAt
                }
              ]
            : []
        };
      } else {
        if (answer.textAnswer) {
          targetStats.questionStats[qIdStr].hasTextResponses = true;
          targetStats.questionStats[qIdStr].textResponseCount++;
          targetStats.questionStats[qIdStr].textResponses.push({
            text: answer.textAnswer,
            school: rating.school ? rating.school.name || "Unknown School" : "Unknown School",
            schoolId: rating.school ? rating.school._id || rating.school : null,
            direction: rating.direction ? rating.direction.name || "Unknown Direction" : "Unknown Direction",
            directionId: rating.direction ? rating.direction._id || rating.direction : null,
            student: rating.student ? rating.student.name : "Anonymous Student",
            date: rating.createdAt
          });
        }

        const schoolId = rating.school ? (rating.school._id || rating.school).toString() : "unknown";
        const schoolName = rating.school ? rating.school.name || "Unknown School" : "Unknown School";

        if (!targetStats.questionStats[qIdStr].schools[schoolId]) {
          targetStats.questionStats[qIdStr].schools[schoolId] = { name: schoolName, count: 0 };
        }
        targetStats.questionStats[qIdStr].schools[schoolId].count++;

        const directionId = rating.direction ? (rating.direction._id || rating.direction).toString() : "unknown";
        const directionName = rating.direction ? rating.direction.name || "Unknown Direction" : "Unknown Direction";

        if (!targetStats.questionStats[qIdStr].directions[directionId]) {
          targetStats.questionStats[qIdStr].directions[directionId] = { name: directionName, count: 0 };
        }
        targetStats.questionStats[qIdStr].directions[directionId].count++;
      }

      if (answer.ratingValue) {
        targetStats.totalRatingValue += answer.ratingValue;
        targetStats.ratingCount++;

        const qStat = targetStats.questionStats[qIdStr];
        qStat.totalValue += answer.ratingValue;
        qStat.count++;
      }
    });
  });

  targetsMap.forEach((targetStat) => {
    if (targetStat.ratingCount > 0) {
      targetStat.averageRating = targetStat.totalRatingValue / targetStat.ratingCount;
    }

    Object.values(targetStat.questionStats).forEach((qStat) => {
      if (qStat.count > 0) {
        qStat.average = qStat.totalValue / qStat.count;
      }
    });

    targetStat.questionStats = Object.values(targetStat.questionStats);
  });

  const targetsArray = Array.from(targetsMap.values());
  const teacherIds = targetsArray.filter((t) => t.targetType === "teacher").map((t) => t.targetId);
  const subjectIds = targetsArray.filter((t) => t.targetType === "subject").map((t) => t.targetId);

  if (teacherIds.length > 0) {
    const teachers = await User.find({ _id: { $in: teacherIds } }).select("_id name").lean();
    teachers.forEach((t) => {
      const key = `teacher-${t._id.toString()}`;
      if (targetsMap.has(key)) targetsMap.get(key).name = t.name;
    });
  }

  if (subjectIds.length > 0) {
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).select("_id name").lean();
    subjects.forEach((s) => {
      const key = `subject-${s._id.toString()}`;
      if (targetsMap.has(key)) targetsMap.get(key).name = s.name;
    });
  }

  if (questions.length > 0) {
    targetsArray.forEach((target) => {
      target.questionStats.forEach((qStat) => {
        const question = questions.find((q) => q._id.toString() === qStat.questionId.toString());
        if (question) {
          qStat.questionText = question.text || "Unknown Question";
          qStat.questionType = question.questionType || "rating";
          qStat.order = question.order || 0;

          if (question.questionType === "text" || qStat.hasTextResponses) {
            qStat.questionType = "text";
          }
        }
      });

      target.questionStats.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }

  const resultsArray = Array.from(targetsMap.values());
  resultsArray.sort((a, b) => b.averageRating - a.averageRating);

  res.status(200).json({
    totalRatings: ratings.length,
    targets: resultsArray,
    questions: questions
      .map((q) => ({
        _id: q._id,
        text: q.text,
        questionType: q.questionType,
        targetType: q.targetType,
        order: q.order
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  });
});

// Get questions for a rating period (Admin management)
const getRatingQuestionsForAdmin = asyncHandler(async (req, res) => {
  const ratingPeriod = await RatingPeriod.findById(req.params.periodId);

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const questionsWithPeriodId = ratingPeriod.questions.map((question) => {
    const questionObj = question.toObject();
    questionObj.ratingPeriod = ratingPeriod._id;
    return questionObj;
  });

  res.status(200).json(questionsWithPeriodId);
});

// Get questions for a rating period (Student submission)
const getRatingQuestionsForStudent = asyncHandler(async (req, res) => {
  const ratingPeriod = await RatingPeriod.findById(req.params.periodId);

  if (!ratingPeriod) {
    res.status(404);
    throw new Error("Rating period not found");
  }

  const now = new Date();
  if (!ratingPeriod.isActive || now < ratingPeriod.startDate || now > ratingPeriod.endDate) {
    res.status(403);
    throw new Error("Rating period is not active");
  }

  const questionsWithPeriodId = ratingPeriod.questions.map((question) => {
    const questionObj = question.toObject();
    questionObj.ratingPeriod = ratingPeriod._id;
    return questionObj;
  });

  res.status(200).json(questionsWithPeriodId);
});

module.exports = {
  createRatingPeriod,
  getRatingPeriods,
  getRatingPeriod,
  updateRatingPeriod,
  deleteRatingPeriod,
  addQuestionToPeriod,
  updateQuestionInPeriod,
  removeQuestionFromPeriod,
  getActiveRatingPeriods,
  getRatingTargets,
  checkStudentRating,
  submitRating,
  getRatingStats,
  getRatingStatsSummary,
  getRatingQuestionsForAdmin,
  getRatingQuestionsForStudent,
  createRatingQuestion
};
