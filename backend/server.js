const express = require("express");
const dotenv = require("dotenv");
require("colors");
const cors = require("cors");
const {
  errorHandler
} = require("./middleware/errorMiddleware");
const {
  setSchoolContext
} = require("./middleware/schoolIdMiddleware");
const {
  connectDB
} = require("./config/db");
const webpush = require("web-push");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

connectDB()
  .then(async () => {
    console.log("MongoDB Connected Succesfully".cyan.bold);
  })
  .catch((err) => {
    console.error(`MongoDB Connection Error: ${err.message}`.red.bold);
    process.exit(1);
  });

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('VAPID keys configured successfully');
  } catch (error) {
    console.warn('VAPID keys configuration failed (push notifications disabled):', error.message);
  }
} else {
  console.log('VAPID keys not configured - push notifications disabled');
}

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per windowMs
  message: {
    message: 'Too many attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
    retryAfterSeconds: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/users/login', authLimiter);
app.use('/api/users/forgot-password', authLimiter);
app.use('/api/users/change-password', authLimiter);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    message: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMITED',
    retryAfterSeconds: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  console.log('[PROXY] Trust proxy enabled for production environment'.cyan);
} else {
  app.set('trust proxy', true);
  console.log('[PROXY] Trust proxy enabled for development environment'.cyan);
}

const allowedOrigins = [
  process.env.FRONTEND_URL, // Environment variable if set
  "http://localhost:5000", // Local development
  "https://localhost:5000" // Local HTTPS development
];


// Configure enhanced CORS with better security & compatibility
// Special CORS handling for public endpoints
app.use('/api/system/maintenance/status', cors({
  origin: '*', // Allow all origins for maintenance status (public endpoint)
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false
}));

const corsOptions = {
  origin: function (origin, callback) {
    console.log('[CORS] Request from origin:', origin);

    // PRODUCTION SECURITY: STRICT ORIGIN VALIDATION ONLY
    if (process.env.NODE_ENV === 'production') {
      // NO bypass allowed in production - SECURITY FIRST
      if (!origin) {
        console.error('[CORS] BLOCKED: No origin header in production request');
        const error = new Error('CORS policy: Origin required in production');
        error.status = 403;
        return callback(error, false);
      }

      // Only allow exact frontend domain in production
      if (origin !== process.env.FRONTEND_URL) {
        console.error(`[CORS] BLOCKED: Unauthorized origin: ${origin}`);
        const error = new Error(`CORS policy: Origin ${origin} not authorized`);
        error.status = 403;
        return callback(error, false);
      }

      console.log(`[CORS] AUTHORIZED: ${origin}`);
      return callback(null, true);
    }

    // Development mode - allow localhost origins only
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      console.log(`[CORS] Dev mode - allowed: ${origin || 'no-origin'}`);
      return callback(null, true);
    }

    // Reject all unauthorized origins
    console.error(`[CORS] BLOCKED: Unauthorized origin: ${origin}`);
    const error = new Error(`CORS policy: Origin ${origin} not authorized`);
    error.status = 403;
    return callback(error, false);
  },
  // Extended methods and headers for better compatibility
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-requested-with",
    "x-client-version",
    "x-client-platform",
    "x-client-origin",
    "x-frontend-url",
    "x-request-id",
    "cache-control",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Headers"
  ],
  exposedHeaders: [
    "X-Request-ID",
    "X-Server-ID"
  ],
  credentials: true, // Important for authentication
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

const globalCors = cors(corsOptions);
app.use((req, res, next) => {
  if (req.path === '/api/system/maintenance/status' || req.path === '/api/health') {
    return next();
  }
  globalCors(req, res, next);
});
app.use(express.json({
  limit: '16kb'
}));
app.use(express.urlencoded({
  extended: false,
  limit: '16kb'
}));

// Set Cache-Control: no-store for all API routes to prevent caching sensitive data
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});





// Import logger for consistent detailed logging
const logger = require("./utils/logger");

// Health check endpoint for Render deployment
app.get("/api/health", (_, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running"
  });
});

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const userAgent = req.headers['user-agent'] || '';
  const host = req.headers.host;

  logger.info('SECURITY', 'Request validation', {
    ip: req.ip,
    origin: origin || 'NO_ORIGIN',
    referer: referer || 'NO_REFERER',
    userAgent: userAgent,
    host: host,
    path: req.path,
    method: req.method
  });

  // Allow health check and maintenance status to pass through
  if (req.path === '/health' || req.path === '/system/maintenance/status') {
    return next();
  }

  // PRODUCTION: Strict validation - BLOCK ALL external requests
  if (process.env.NODE_ENV === 'production') {
    // Must have origin from authorized frontend
    if (!origin || origin !== process.env.FRONTEND_URL) {
      logger.warn('SECURITY', 'BLOCKED: Unauthorized origin in production', {
        ip: req.ip,
        origin: origin || 'MISSING',
        userAgent: userAgent,
        path: req.path
      });
      return res.status(403).json({
        error: 'Access denied',
        code: 'UNAUTHORIZED_ORIGIN',
        message: 'This API only accepts requests from authorized frontend applications'
      });
    }

    // Must have referer from authorized frontend 
    if (!referer || !referer.startsWith(process.env.FRONTEND_URL)) {
      logger.warn('SECURITY', 'BLOCKED: Invalid referer in production', {
        ip: req.ip,
        referer: referer || 'MISSING',
        userAgent: userAgent,
        path: req.path
      });
      return res.status(403).json({
        error: 'Access denied',
        code: 'INVALID_REFERER',
        message: 'Invalid request source'
      });
    }

    // Block suspicious user agents (curl, postman, wget, etc)
    const suspiciousAgents = ['curl', 'postman', 'wget', 'httpie', 'insomnia', 'rest-client', 'python-requests'];
    const isSuspicious = suspiciousAgents.some(agent =>
      userAgent.toLowerCase().includes(agent.toLowerCase())
    );

    if (isSuspicious || !userAgent || userAgent.length < 10) {
      logger.warn('SECURITY', 'BLOCKED: Suspicious user agent', {
        ip: req.ip,
        userAgent: userAgent || 'MISSING',
        path: req.path,
        isSuspicious: isSuspicious
      });
      return res.status(403).json({
        error: 'Access denied',
        code: 'SUSPICIOUS_CLIENT',
        message: 'Direct API access not allowed'
      });
    }
  }

  // Development mode: Still block obvious external tools
  if (process.env.NODE_ENV !== 'production') {
    const suspiciousAgents = ['curl', 'postman', 'wget', 'httpie'];
    const isSuspicious = suspiciousAgents.some(agent =>
      userAgent.toLowerCase().includes(agent.toLowerCase())
    );

    if (isSuspicious) {
      logger.warn('SECURITY', 'BLOCKED: External tool in dev mode', {
        ip: req.ip,
        userAgent: userAgent,
        path: req.path
      });
      return res.status(403).json({
        error: 'Access denied',
        code: 'EXTERNAL_TOOL_BLOCKED',
        message: 'External API tools are blocked. Use the frontend application.'
      });
    }
  }

  logger.info('SECURITY', 'Request authorized', {
    ip: req.ip,
    path: req.path,
    userAgent: userAgent.substring(0, 50) + '...'
  });

  next();
});



app.get('/api/system/maintenance/status', require('./controllers/systemMaintenanceController').getMaintenanceStatus);

// System maintenance admin routes (protected)
app.use("/api/system/maintenance", require("./routes/systemMaintenanceRoutes"));
app.use("/api/beta-features", require("./routes/betaFeaturesRoutes"));
app.use("/api/schedule-runs", require("./routes/scheduleRunRoutes"));

app.use("/api/users", require("./routes/userRoutes"));

const {
  protect,
  checkMaintenanceMode
} = require("./middleware/authMiddleware");
const {
  addFeatureFlags,
  checkCalendarEnabled,
  checkRatingEnabled
} = require("./middleware/featureToggleMiddleware");

app.use(
  "/api/contacts",
  checkMaintenanceMode,
  addFeatureFlags,
  require("./routes/contactRoutes")
);

app.get(
  "/api/patch-notes/public",
  async (_, res) => {
    try {
      const PatchNote = require('./models/patchNoteModel');
      const patchNotes = await PatchNote.find({
          isActive: true
        })
        .sort({
          createdAt: -1
        })
        .select('title version type createdAt')
        .lean();

      res.status(200).json(patchNotes);
    } catch (error) {
      console.error('Error retrieving public patch notes:', error);
      res.status(500).json({
        message: 'Failed to retrieve patch notes'
      });
    }
  }
);

app.use(
  "/api/patch-notes",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/patchNoteRoutes")
);
app.use(
  "/api/directions",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/directionRoutes")
);
app.use(
  "/api/subjects",
  protect,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/subjectRoutes")
);
app.use(
  "/api/students",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/studentRoutes")
);
app.use(
  "/api/grades",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/gradeAnalysisRoutes")
);
app.use(
  "/api/grades",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/gradeRoutes")
);
app.use(
  "/api/classes",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/classRoutes")
);
app.use(
  "/api/schedule",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/scheduleRoutes")
);
app.use(
  "/api/stats",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/studentStatsRoutes")
);
app.use(
  "/api/notifications",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/notificationRoutes")
);
app.use(
  "/api/payments",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  require("./routes/paymentRoutes")
);

app.use(
  "/api/ratings",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  checkRatingEnabled,
  require("./routes/ratingRoutes")
);
app.use(
  "/api/events",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  checkCalendarEnabled,
  require("./routes/eventRoutes")
);

app.use(
  "/api/sessions",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/sessionRoutes")
);
app.use(
  "/api/attendance",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/classAttendanceRoutes")
);
app.use(
  "/api/reports",
  protect,
  checkMaintenanceMode,
  setSchoolContext,
  addFeatureFlags,
  require("./routes/reportingRoutes")
);
app.use(
  "/api/themes",
  protect,
  checkMaintenanceMode,
  require("./routes/themeRoutes")
);


app.use("/api/schools", require("./routes/schoolRoutes"));

app.use(
  "/api/school-permissions",
  protect,
  checkMaintenanceMode,
  require("./routes/schoolPermissionsRoutes")
);
app.use("/api/branches", protect, checkMaintenanceMode, require("./routes/schoolRoutes"));

app.use("/api/contact", checkMaintenanceMode, require("./routes/contactRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
app.use("/api/superadmin", require("./routes/superAdminRoutes"));
app.use("/api/maintenance-announcements", protect, require("./routes/maintenanceAnnouncementRoutes"));

// Add catch-all for unmatched API routes to return proper JSON errors
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    error: 'Route not found'
  });
});

app.get("/", (_, res) => res.send("API is running..."));

// Error middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on localhost:${PORT}`.green.bold);
});